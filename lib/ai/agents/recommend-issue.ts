import { z } from "zod";
import OpenAI from "openai";
import {
  flushTraces,
  DEFAULT_MODEL,
  createTrackedAI,
  createAgentTrace,
} from "../openai";

// ============================================
// TOOL DEFINITIONS
// ============================================

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "fetch_repo_stats",
      description:
        "Get repository health metrics including star count, recent activity, contributor count, and maintainer responsiveness",
      parameters: {
        type: "object",
        properties: {
          repoUrl: {
            type: "string",
            description: "The GitHub repository URL or owner/repo format",
          },
        },
        required: ["repoUrl"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_issue_complexity",
      description:
        "Analyze the technical complexity of an issue based on its description, labels, and context",
      parameters: {
        type: "object",
        properties: {
          issueId: {
            type: "string",
            description: "The issue ID to analyze",
          },
          issueBody: {
            type: "string",
            description: "The full issue body/description text",
          },
          labels: {
            type: "array",
            items: { type: "string" },
            description: "Labels attached to the issue",
          },
        },
        required: ["issueId", "issueBody"],
      },
    },
  },
];

// ============================================
// TOOL HANDLERS
// ============================================

interface RepoStats {
  repoUrl: string;
  stars: number;
  recentCommits: number;
  openIssues: number;
  contributorCount: number;
  maintainerResponsiveness: "high" | "medium" | "low";
  lastCommitDaysAgo: number;
  healthScore: number;
}

interface ComplexityAnalysis {
  issueId: string;
  complexityScore: number;
  factors: string[];
  estimatedHours: string;
  requiredSkills: string[];
  hasTests: boolean;
  hasDocumentation: boolean;
}

async function handleFetchRepoStats(repoUrl: string): Promise<RepoStats> {
  // Extract owner/repo from URL if full URL provided
  const repoPath = repoUrl
    .replace("https://github.com/", "")
    .replace(".git", "");

  // Simulated repo stats - in production, this would call GitHub API
  // The LLM can use these metrics to make better recommendations
  const mockStats: Record<string, Partial<RepoStats>> = {
    default: {
      stars: Math.floor(Math.random() * 10000),
      recentCommits: Math.floor(Math.random() * 50) + 5,
      openIssues: Math.floor(Math.random() * 200) + 10,
      contributorCount: Math.floor(Math.random() * 100) + 5,
      lastCommitDaysAgo: Math.floor(Math.random() * 30),
    },
  };

  const stats = mockStats[repoPath] || mockStats.default;
  const lastCommitDaysAgo = stats.lastCommitDaysAgo ?? 7;

  // Calculate maintainer responsiveness based on activity
  let maintainerResponsiveness: "high" | "medium" | "low" = "medium";
  if (lastCommitDaysAgo < 7 && (stats.recentCommits ?? 0) > 20) {
    maintainerResponsiveness = "high";
  } else if (lastCommitDaysAgo > 30 || (stats.recentCommits ?? 0) < 5) {
    maintainerResponsiveness = "low";
  }

  // Calculate health score (0-100)
  const healthScore = Math.min(
    100,
    Math.max(
      0,
      ((stats.recentCommits ?? 0) * 2 +
        (stats.contributorCount ?? 0) +
        (100 - lastCommitDaysAgo * 2)) /
        3,
    ),
  );

  return {
    repoUrl: repoPath,
    stars: stats.stars ?? 0,
    recentCommits: stats.recentCommits ?? 0,
    openIssues: stats.openIssues ?? 0,
    contributorCount: stats.contributorCount ?? 0,
    maintainerResponsiveness,
    lastCommitDaysAgo,
    healthScore: Math.round(healthScore),
  };
}

async function handleAnalyzeIssueComplexity(
  issueId: string,
  issueBody: string,
  labels?: string[],
): Promise<ComplexityAnalysis> {
  const bodyLower = issueBody.toLowerCase();
  const labelSet = new Set((labels || []).map((l) => l.toLowerCase()));

  const factors: string[] = [];
  let complexityScore = 3; // Base complexity

  // Analyze based on labels
  if (labelSet.has("good first issue") || labelSet.has("good-first-issue")) {
    complexityScore -= 2;
    factors.push("Marked as good first issue");
  }
  if (labelSet.has("help wanted") || labelSet.has("help-wanted")) {
    factors.push("Maintainers seeking help");
  }
  if (labelSet.has("bug")) {
    factors.push("Bug fix required");
  }
  if (labelSet.has("feature") || labelSet.has("enhancement")) {
    complexityScore += 1;
    factors.push("New feature implementation");
  }
  if (labelSet.has("documentation") || labelSet.has("docs")) {
    complexityScore -= 1;
    factors.push("Documentation work");
  }

  // Analyze based on body content
  if (bodyLower.includes("breaking change")) {
    complexityScore += 2;
    factors.push("Involves breaking changes");
  }
  if (bodyLower.includes("security") || bodyLower.includes("vulnerability")) {
    complexityScore += 1;
    factors.push("Security-related work");
  }
  if (bodyLower.includes("test") || bodyLower.includes("spec")) {
    factors.push("Testing may be required");
  }
  if (bodyLower.includes("refactor")) {
    complexityScore += 1;
    factors.push("Refactoring involved");
  }

  // Estimate based on body length
  if (issueBody.length > 2000) {
    complexityScore += 1;
    factors.push("Detailed/lengthy description");
  } else if (issueBody.length < 200) {
    factors.push("Brief description - may need clarification");
  }

  // Clamp score
  complexityScore = Math.max(1, Math.min(10, complexityScore));

  // Estimate hours based on complexity
  const hourRanges: Record<number, string> = {
    1: "1-2 hours",
    2: "2-4 hours",
    3: "4-8 hours",
    4: "1-2 days",
    5: "2-3 days",
    6: "3-5 days",
    7: "1 week",
    8: "1-2 weeks",
    9: "2-4 weeks",
    10: "1+ month",
  };

  // Determine required skills
  const requiredSkills: string[] = [];
  if (bodyLower.includes("api") || bodyLower.includes("endpoint")) {
    requiredSkills.push("API development");
  }
  if (bodyLower.includes("database") || bodyLower.includes("sql")) {
    requiredSkills.push("Database");
  }
  if (bodyLower.includes("frontend") || bodyLower.includes("ui")) {
    requiredSkills.push("Frontend/UI");
  }
  if (bodyLower.includes("test")) {
    requiredSkills.push("Testing");
  }
  if (requiredSkills.length === 0) {
    requiredSkills.push("General programming");
  }

  return {
    issueId,
    complexityScore,
    factors: factors.length > 0 ? factors : ["Standard issue complexity"],
    estimatedHours: hourRanges[complexityScore] || "Unknown",
    requiredSkills,
    hasTests: bodyLower.includes("test"),
    hasDocumentation: bodyLower.includes("doc") || bodyLower.includes("readme"),
  };
}

// Execute a tool call and return the result
async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<string> {
  switch (toolName) {
    case "fetch_repo_stats": {
      const result = await handleFetchRepoStats(args.repoUrl as string);
      return JSON.stringify(result, null, 2);
    }
    case "analyze_issue_complexity": {
      const result = await handleAnalyzeIssueComplexity(
        args.issueId as string,
        args.issueBody as string,
        args.labels as string[] | undefined,
      );
      return JSON.stringify(result, null, 2);
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

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
  traceId: z
    .string()
    .optional()
    .describe("Opik trace ID for feedback tracking"),
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

  const systemPrompt = `You are an expert open source contribution advisor with access to tools for gathering additional information. Your job is to analyze GitHub issues and recommend the best one for a specific contributor.

You have access to the following tools:
1. fetch_repo_stats - Get repository health metrics (stars, activity, maintainer responsiveness)
2. analyze_issue_complexity - Get detailed complexity analysis for specific issues

WORKFLOW:
1. First, use your tools to gather more information:
   - Call fetch_repo_stats for repositories you want to evaluate
   - Call analyze_issue_complexity for promising issues
2. Then, synthesize all gathered information to make your recommendation

You must reason carefully about:
1. DIFFICULTY ASSESSMENT: Analyze each issue's complexity based on:
   - Tool-provided complexity analysis
   - Labels (good-first-issue, help-wanted, bug, feature, etc.)
   - Description length and technical depth
   - Number of comments (more comments may indicate complexity or contention)
   - Repository language match with user skills

2. USER FIT ANALYSIS: Consider how well each issue matches the user:
   - Skill level alignment (beginners need simpler issues)
   - Language proficiency match
   - Interest alignment with issue domain
   - Time commitment vs user availability

3. REPOSITORY HEALTH: Use fetch_repo_stats to assess:
   - Maintainer responsiveness (critical for new contributors)
   - Recent activity (avoid stale repositories)
   - Community size and engagement

4. RISK EVALUATION: Assess potential challenges:
   - LOW: Clear scope, good documentation, maintainer responsive, matches user skills
   - MEDIUM: Some ambiguity, may require learning, moderate complexity
   - HIGH: Unclear requirements, complex codebase, potential for scope creep, skill gap

5. RANKING: Rank all issues from best to worst fit, not just by difficulty but by overall suitability for THIS specific user.

Be decisive. Use your tools to gather information, then pick ONE best issue and explain your reasoning clearly.`;

  const userContext = `
## USER PROFILE
- Username: ${user.username}
- Skill Level: ${user.skillLevel}
- Preferred Languages: ${user.preferredLanguages.join(", ")}
- Interests: ${user.interests?.join(", ") || "Not specified"}
- Past Contributions: ${user.pastContributions || 0}
- Available Hours/Week: ${user.availableHoursPerWeek || "Not specified"}
`;

  // Build a map of issues for quick lookup
  const issueMap = new Map(issues.map((issue) => [issue.id, issue]));

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

First, use your tools to gather additional information about the repositories and issues. Then provide your final recommendation.

When you're ready to give your final answer, respond with ONLY a valid JSON object (no markdown, no code blocks) in this exact format:
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

  // Create a parent trace for the entire agent workflow
  const agentTrace = createAgentTrace("issue-recommender-agent", {
    user: { username: user.username, skillLevel: user.skillLevel },
    issueCount: issues.length,
  });

  // Get the trace ID for feedback tracking
  const traceId = agentTrace.data.id;

  // Create tracked AI client nested under the parent trace
  const trackedAI = createTrackedAI("llm-call", agentTrace);

  // Initialize messages for the agentic loop
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  const MAX_ITERATIONS = 10;
  let iterations = 0;

  // Agentic loop - keep calling LLM until it stops making tool calls
  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const completion = await trackedAI.chat.completions.create({
      model: DEFAULT_MODEL,
      messages,
      tools,
      tool_choice: iterations === 1 ? "auto" : "auto", // Let LLM decide
      temperature: 0.7,
      max_tokens: 2048,
    });

    const choice = completion.choices[0];
    const assistantMessage = choice.message;

    // Add assistant's response to message history
    messages.push(assistantMessage);

    // Check if we're done (no more tool calls)
    if (
      choice.finish_reason !== "tool_calls" &&
      !assistantMessage.tool_calls?.length
    ) {
      // LLM is done - extract the final response
      const text = assistantMessage.content?.trim() ?? "";

      let result: RecommendIssueOutput;
      try {
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : text;
        const parsed = JSON.parse(jsonStr);
        result = { ...parsed, traceId };
      } catch {
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
          traceId,
        };
      }

      // End the trace with the result
      agentTrace.update({ output: result }).end();
      await flushTraces();
      return result;
    }

    // Process tool calls
    if (assistantMessage.tool_calls) {
      for (const toolCall of assistantMessage.tool_calls) {
        // Type assertion to handle Opik-wrapped types
        const tc = toolCall as {
          id: string;
          type: string;
          function: { name: string; arguments: string };
        };
        const functionName = tc.function.name;
        let args: Record<string, unknown>;

        try {
          args = JSON.parse(tc.function.arguments);
        } catch {
          args = {};
        }

        // For analyze_issue_complexity, inject the full issue body if we have it
        if (functionName === "analyze_issue_complexity" && args.issueId) {
          const issue = issueMap.get(args.issueId as string);
          if (issue) {
            args.issueBody = args.issueBody || issue.body || "";
            args.labels = args.labels || issue.labels;
          }
        }

        // Create a span for the tool execution
        const toolSpan = agentTrace.span({
          name: `tool:${functionName}`,
          input: args,
        });

        // Execute the tool
        const toolResult = await executeTool(functionName, args);

        // End the tool span with output
        toolSpan.update({ output: JSON.parse(toolResult) }).end();

        // Add tool result to messages
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult,
        });
      }
    }
  }

  // If we hit max iterations, return a fallback
  const fallbackIssue = issues[0];
  const fallbackResult: RecommendIssueOutput = {
    recommendedIssue: {
      id: fallbackIssue.id,
      title: fallbackIssue.title,
      repository: fallbackIssue.repository,
      url: fallbackIssue.url,
    },
    explanation:
      "Agent reached maximum iterations. Recommending the first issue as a starting point.",
    riskLevel: "medium",
    riskFactors: ["Analysis incomplete due to iteration limit"],
    alternativeIssues: [],
    rankedIssues: issues.map((issue) => ({
      issueId: issue.id,
      difficultyScore: 5,
      fitScore: 5,
      reasoning: "Unable to complete analysis",
    })),
    traceId,
  };

  // End the trace with the fallback result
  agentTrace.update({ output: fallbackResult }).end();
  await flushTraces();

  return fallbackResult;
}
