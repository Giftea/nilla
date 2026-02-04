import { z } from "zod";
import { flushTraces, DEFAULT_MODEL, createTrackedAI } from "../openai";

// ============================================
// INPUT SCHEMAS
// ============================================

export const UserProfileSchema = z.object({
  id: z.string().describe("User's unique identifier"),
  username: z.string().describe("GitHub username"),
  skillLevel: z
    .enum(["beginner", "intermediate", "advanced"])
    .describe("User's self-assessed skill level"),
  preferredLanguages: z
    .array(z.string())
    .describe("Programming languages the user is comfortable with"),
  interests: z
    .array(z.string())
    .optional()
    .describe(
      "Topics or areas the user is interested in (e.g., 'testing', 'docs', 'frontend')",
    ),
  pastContributions: z
    .number()
    .optional()
    .default(0)
    .describe("Number of past open source contributions"),
  availableHoursPerWeek: z
    .number()
    .optional()
    .describe("Hours per week available for contributions"),
});

export const IssueSchema = z.object({
  id: z.string().describe("Issue ID or number"),
  title: z.string().describe("Issue title"),
  body: z.string().optional().describe("Issue description/body"),
  labels: z.array(z.string()).describe("Labels attached to the issue"),
  repository: z.string().describe("Repository name (owner/repo)"),
  language: z
    .string()
    .optional()
    .describe("Primary language of the repository"),
  openedAt: z.string().optional().describe("When the issue was opened"),
  commentCount: z.number().optional().default(0).describe("Number of comments"),
  url: z.string().describe("URL to the issue"),
});

export const RecommendIssueInputSchema = z.object({
  user: UserProfileSchema.describe("The user seeking issue recommendations"),
  issues: z
    .array(IssueSchema)
    .min(1)
    .max(20)
    .describe("List of candidate issues to evaluate (1-20 issues)"),
});

// ============================================
// OUTPUT SCHEMAS
// ============================================

export const IssueAnalysisSchema = z.object({
  issueId: z.string().describe("The issue ID being analyzed"),
  difficultyScore: z
    .number()
    .min(1)
    .max(10)
    .describe("Estimated difficulty (1=trivial, 10=very complex)"),
  fitScore: z
    .number()
    .min(1)
    .max(10)
    .describe("How well this issue fits the user (1=poor fit, 10=perfect fit)"),
  reasoning: z.string().describe("Brief explanation of the scoring"),
});

export const RecommendIssueOutputSchema = z.object({
  recommendedIssue: z.object({
    id: z.string().describe("ID of the recommended issue"),
    title: z.string().describe("Title of the recommended issue"),
    repository: z.string().describe("Repository of the recommended issue"),
    url: z.string().describe("URL to the recommended issue"),
  }),
  explanation: z
    .string()
    .describe(
      "Detailed explanation of why this issue is the best fit for the user",
    ),
  riskLevel: z
    .enum(["low", "medium", "high"])
    .describe("Risk level for the user taking on this issue"),
  riskFactors: z
    .array(z.string())
    .describe("Specific factors contributing to the risk assessment"),
  alternativeIssues: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        reason: z.string().describe("Why this is a good alternative"),
      }),
    )
    .max(2)
    .describe("Up to 2 alternative recommendations"),
  rankedIssues: z
    .array(IssueAnalysisSchema)
    .describe("All issues ranked from best to worst fit"),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type Issue = z.infer<typeof IssueSchema>;
export type RecommendIssueInput = z.infer<typeof RecommendIssueInputSchema>;
export type RecommendIssueOutput = z.infer<typeof RecommendIssueOutputSchema>;
export type IssueAnalysis = z.infer<typeof IssueAnalysisSchema>;

// ============================================
// AGENT FUNCTION
// ============================================

export async function recommendIssueFlow(
  input: RecommendIssueInput,
): Promise<RecommendIssueOutput> {
  const { user, issues } = input;

  const systemPrompt = `You are an expert open source contribution advisor. Your job is to analyze GitHub issues and recommend the best one for a specific contributor.

You must reason carefully about:
1. DIFFICULTY ASSESSMENT: Analyze each issue's complexity based on:
   - Labels (good-first-issue, help-wanted, bug, feature, etc.)
   - Description length and technical depth
   - Number of comments (more comments may indicate complexity or contention)
   - Repository language match with user skills

2. USER FIT ANALYSIS: Consider how well each issue matches the user:
   - Skill level alignment (beginners need simpler issues)
   - Language proficiency match
   - Interest alignment with issue domain
   - Time commitment vs user availability

3. RISK EVALUATION: Assess potential challenges:
   - LOW: Clear scope, good documentation, maintainer responsive, matches user skills
   - MEDIUM: Some ambiguity, may require learning, moderate complexity
   - HIGH: Unclear requirements, complex codebase, potential for scope creep, skill gap

4. RANKING: Rank all issues from best to worst fit, not just by difficulty but by overall suitability for THIS specific user.

Be decisive. Pick ONE best issue and explain your reasoning clearly.`;

  const userContext = `
## USER PROFILE
- Username: ${user.username}
- Skill Level: ${user.skillLevel}
- Preferred Languages: ${user.preferredLanguages.join(", ")}
- Interests: ${user.interests?.join(", ") || "Not specified"}
- Past Contributions: ${user.pastContributions || 0}
- Available Hours/Week: ${user.availableHoursPerWeek || "Not specified"}
`;

  const issuesContext = issues
    .map(
      (issue, idx) => `
## ISSUE ${idx + 1}
- ID: ${issue.id}
- Title: ${issue.title}
- Repository: ${issue.repository}
- Language: ${issue.language || "Unknown"}
- Labels: ${issue.labels.join(", ") || "None"}
- Comments: ${issue.commentCount || 0}
- URL: ${issue.url}
- Description: ${issue.body?.slice(0, 500) || "No description"}${issue.body && issue.body.length > 500 ? "..." : ""}
`,
    )
    .join("\n---\n");

  const userMessage = `${userContext}

## CANDIDATE ISSUES
${issuesContext}

Analyze each issue and provide your recommendation. Respond with ONLY a valid JSON object (no markdown, no code blocks) in this exact format:
{
  "recommendedIssue": {
    "id": "issue_id",
    "title": "issue title",
    "repository": "owner/repo",
    "url": "https://..."
  },
  "explanation": "2-3 sentences explaining why this issue is the best fit for this user",
  "riskLevel": "low" | "medium" | "high",
  "riskFactors": ["factor 1", "factor 2"],
  "alternativeIssues": [
    {"id": "id", "title": "title", "reason": "why it's a good alternative"}
  ],
  "rankedIssues": [
    {"issueId": "id", "difficultyScore": 1-10, "fitScore": 1-10, "reasoning": "brief explanation"}
  ]
}`;
  const trackedAI = createTrackedAI("recommend-issue-completion");

  // Call OpenAI with Opik tracking
  const completion = await trackedAI.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 2048,
  });

  const text = completion.choices[0]?.message?.content?.trim() ?? "";

  // Parse the LLM response
  let result: RecommendIssueOutput;
  try {
    // Try to extract JSON if wrapped in markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : text;
    result = JSON.parse(jsonStr);
  } catch {
    // If parsing fails, create a fallback response
    const fallbackIssue = issues[0];
    result = {
      recommendedIssue: {
        id: fallbackIssue.id,
        title: fallbackIssue.title,
        repository: fallbackIssue.repository,
        url: fallbackIssue.url,
      },
      explanation:
        "Unable to fully analyze issues. Recommending the first issue as a starting point. Please review manually.",
      riskLevel: "medium",
      riskFactors: ["Automated analysis incomplete"],
      alternativeIssues: [],
      rankedIssues: issues.map((issue) => ({
        issueId: issue.id,
        difficultyScore: 5,
        fitScore: 5,
        reasoning: "Unable to analyze - manual review recommended",
      })),
    };
  }

  // Flush traces to ensure they're sent
  await flushTraces();

  return result;
}
