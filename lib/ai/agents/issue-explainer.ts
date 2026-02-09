import { z } from "zod";
import { flushTraces, DEFAULT_MODEL, createTrackedAI } from "../openai";

// ============================================
// INPUT SCHEMAS
// ============================================

export const ExplainerIssueSchema = z.object({
  title: z.string().describe("Title of the GitHub issue"),
  body: z.string().optional().describe("Body/description of the issue"),
  labels: z.array(z.string()).describe("Labels attached to the issue"),
  repository: z.string().describe("Repository name (owner/repo)"),
  url: z.string().describe("URL to the GitHub issue"),
});

export const ExplainerUserSchema = z.object({
  experienceLevel: z
    .enum(["beginner", "intermediate", "advanced"])
    .describe("User's self-assessed experience level"),
});

export const IssueExplainerInputSchema = z.object({
  issue: ExplainerIssueSchema.describe("The GitHub issue to explain"),
  user: ExplainerUserSchema.describe("Context about the user"),
  repoContext: z
    .string()
    .optional()
    .describe(
      "Pre-formatted repository documentation retrieved via RAG. " +
        "May be empty if no relevant docs were found."
    ),
});

// ============================================
// OUTPUT SCHEMAS
// ============================================

export const IssueExplainerOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      "A plain-English explanation of what the issue is about, written " +
        "for the user's experience level"
    ),

  expectedOutcome: z
    .string()
    .describe(
      "What the maintainer is likely expecting as a result — the definition " +
        "of 'done' for this issue"
    ),

  repoGuidelines: z
    .array(z.string())
    .describe(
      "Repo-specific rules, conventions, or expectations extracted from the " +
        "provided documentation context. Empty array if no context was provided " +
        "or nothing relevant was found."
    ),

  beginnerPitfalls: z
    .array(z.string())
    .describe(
      "Common mistakes or misunderstandings a newer contributor might run into " +
        "when working on this issue"
    ),

  suggestedApproach: z
    .string()
    .describe(
      "A high-level outline of how to approach solving this issue, " +
        "appropriate for the user's experience level"
    ),

  keyTerms: z
    .array(
      z.object({
        term: z.string().describe("A technical term or concept from the issue"),
        definition: z
          .string()
          .describe("A brief, beginner-friendly explanation of the term"),
      })
    )
    .describe(
      "Technical terms or jargon from the issue that might need explanation. " +
        "Targeted at the user's experience level — fewer terms for advanced users."
    ),

  confidenceNote: z
    .string()
    .describe(
      "A short note about what the agent is confident about vs. what " +
        "the contributor should verify with the maintainer"
    ),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type ExplainerIssue = z.infer<typeof ExplainerIssueSchema>;
export type ExplainerUser = z.infer<typeof ExplainerUserSchema>;
export type IssueExplainerInput = z.infer<typeof IssueExplainerInputSchema>;
export type IssueExplainerOutput = z.infer<typeof IssueExplainerOutputSchema>;

// ============================================
// AGENT FUNCTION
// ============================================

export async function issueExplainerFlow(
  input: IssueExplainerInput
): Promise<IssueExplainerOutput> {
  const { issue, user, repoContext } = input;

  // Adapt the system prompt depth based on experience level
  const levelGuidance: Record<string, string> = {
    beginner:
      "The user is a BEGINNER. Use simple language, avoid jargon (or define it), " +
      "and be thorough in your explanations. Assume they may not know Git workflows, " +
      "testing conventions, or project architecture.",
    intermediate:
      "The user is INTERMEDIATE. They understand basic Git, PRs, and coding but may " +
      "not know this project's specific conventions. Be clear but not overly basic.",
    advanced:
      "The user is ADVANCED. Keep explanations concise and focus on project-specific " +
      "nuances. Skip basic concepts — they know how open source works.",
  };

  const systemPrompt = `You are an Issue Explainer for open source contributors. Your job is to help a developer understand a GitHub issue so they can confidently start working on it.

${levelGuidance[user.experienceLevel]}

RULES:
1. GROUND your explanations in the actual issue text and any provided repository documentation.
2. DO NOT invent repository rules or conventions that are not mentioned in the provided documentation context. If no documentation context is provided, say so honestly.
3. If the issue is ambiguous or unclear, call that out — don't fill in gaps with guesses.
4. Be supportive and educational in tone, not condescending.
5. Focus on practical understanding: what is being asked, why it matters, and how to approach it.

OUTPUT FORMAT:
Respond with ONLY a valid JSON object (no markdown, no code blocks) matching this structure:
{
  "summary": "Plain-English explanation of the issue",
  "expectedOutcome": "What 'done' looks like for this issue",
  "repoGuidelines": ["Guideline from docs...", "Another guideline..."],
  "beginnerPitfalls": ["Common mistake 1...", "Common mistake 2..."],
  "suggestedApproach": "Step-by-step outline of how to tackle this",
  "keyTerms": [{"term": "...", "definition": "..."}],
  "confidenceNote": "What you're confident about vs. what needs verification"
}`;

  // Build the user message with all available context
  let userMessage = `## ISSUE DETAILS
- **Title:** ${issue.title}
- **Repository:** ${issue.repository}
- **Labels:** ${issue.labels.length > 0 ? issue.labels.join(", ") : "None"}
- **URL:** ${issue.url}

### Issue Description
${issue.body?.slice(0, 3000) || "No description provided."}${issue.body && issue.body.length > 3000 ? "\n\n[...truncated]" : ""}
`;

  // Inject RAG context if available
  if (repoContext && repoContext.trim()) {
    userMessage += `
---

${repoContext}

---

Use the documentation above to identify repo-specific guidelines, conventions, or expectations relevant to this issue. Only reference rules that actually appear in the documentation.
`;
  } else {
    userMessage += `
---

*No repository documentation context was available for this issue. Do not invent any repo-specific guidelines.*
`;
  }

  userMessage += `
Explain this issue for a **${user.experienceLevel}** contributor.`;

  const trackedAI = createTrackedAI("issue-explainer-completion");

  // Call OpenAI with Opik tracking
  const completion = await trackedAI.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.5,
    max_tokens: 2048,
  });

  const text = completion.choices[0]?.message?.content?.trim() ?? "";

  // Parse the LLM response
  let result: IssueExplainerOutput;
  try {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : text;
    result = JSON.parse(jsonStr);
  } catch {
    // Fallback: return a safe structured response rather than crashing
    result = {
      summary:
        "Unable to fully analyze this issue automatically. Please read the issue " +
        "description carefully and consider asking a clarifying question in the comments.",
      expectedOutcome:
        "Review the issue description and any linked discussions to understand " +
        "what the maintainer expects.",
      repoGuidelines: [],
      beginnerPitfalls: [
        "Make sure to read the full issue thread, including comments, before starting work.",
        "Check if someone else is already working on this issue.",
      ],
      suggestedApproach:
        "1. Read the issue thoroughly.\n2. Check linked issues or PRs for context.\n" +
        "3. Ask the maintainer for clarification if anything is unclear.",
      keyTerms: [],
      confidenceNote:
        "This is a fallback response because the AI could not parse the issue fully. " +
        "Please review the issue manually.",
    };
  }

  // Ensure repoGuidelines is empty when no context was provided,
  // regardless of what the LLM returned
  if (!repoContext || !repoContext.trim()) {
    result.repoGuidelines = [];
  }

  await flushTraces();

  return result;
}
