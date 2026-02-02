import { z } from "zod";
import { ai, opikClient } from "../genkit";

// ============================================
// MILESTONE DEFINITIONS
// ============================================

export const MilestoneEnum = z.enum([
  "not_started",
  "read_issue",
  "ask_question",
  "work_on_solution",
  "open_pr",
  "completed",
]);

export type Milestone = z.infer<typeof MilestoneEnum>;

export const MILESTONE_ORDER: Milestone[] = [
  "not_started",
  "read_issue",
  "ask_question",
  "work_on_solution",
  "open_pr",
  "completed",
];

// ============================================
// INPUT SCHEMAS
// ============================================

export const CommitmentSchema = z.object({
  id: z.string().describe("Unique commitment ID"),
  issueTitle: z.string().describe("Title of the GitHub issue"),
  issueUrl: z.string().describe("URL to the GitHub issue"),
  repository: z.string().describe("Repository name (owner/repo)"),
  createdAt: z.string().describe("ISO timestamp when commitment was made"),
  deadlineAt: z.string().describe("ISO timestamp of the 7-day deadline"),
  currentMilestone: MilestoneEnum.describe("Current milestone the user is on"),
  milestonesCompleted: z
    .array(MilestoneEnum)
    .describe("List of milestones already completed"),
  lastActivityAt: z
    .string()
    .optional()
    .describe("ISO timestamp of last user activity on this commitment"),
});

export const UserContextSchema = z.object({
  username: z.string().describe("User's GitHub username"),
  totalCommitments: z
    .number()
    .optional()
    .describe("Total number of active commitments"),
  completedCommitments: z
    .number()
    .optional()
    .describe("Number of successfully completed commitments"),
  timezone: z.string().optional().describe("User's timezone for context"),
});

export const CommitmentCoachInputSchema = z.object({
  commitment: CommitmentSchema.describe("The commitment to coach on"),
  user: UserContextSchema.describe("Context about the user"),
  currentTime: z
    .string()
    .optional()
    .describe("Current ISO timestamp (defaults to now if not provided)"),
});

// ============================================
// OUTPUT SCHEMAS
// ============================================

export const RiskLevelEnum = z.enum(["on_track", "needs_attention", "at_risk", "critical"]);

export const CommitmentCoachOutputSchema = z.object({
  // Core coaching output
  nextAction: z.object({
    action: z.string().describe("The specific next action the user should take"),
    why: z.string().describe("Brief explanation of why this action matters now"),
    estimatedMinutes: z
      .number()
      .optional()
      .describe("Rough estimate of time needed for this action"),
  }),

  nudge: z.object({
    message: z
      .string()
      .describe("An encouraging, coach-like message tailored to the user's situation"),
    tone: z
      .enum(["encouraging", "motivating", "celebratory", "urgent", "supportive"])
      .describe("The emotional tone of the nudge"),
  }),

  // Risk assessment
  riskAssessment: z.object({
    level: RiskLevelEnum.describe("Current risk level for missing the deadline"),
    reason: z.string().describe("Why this risk level was assigned"),
    daysRemaining: z.number().describe("Days remaining until deadline"),
    hoursRemaining: z.number().describe("Hours remaining until deadline"),
  }),

  // Warning (only if at risk)
  warning: z
    .object({
      message: z.string().describe("A clear warning about the deadline risk"),
      suggestion: z.string().describe("What the user can do to get back on track"),
    })
    .optional()
    .describe("Present only if user is at risk of missing deadline"),

  // Progress context
  progress: z.object({
    currentMilestone: MilestoneEnum,
    milestonesRemaining: z.number().describe("Number of milestones left to complete"),
    percentComplete: z.number().describe("Percentage of journey completed (0-100)"),
  }),

  // UI-ready metadata
  meta: z.object({
    generatedAt: z.string().describe("ISO timestamp of when this coaching was generated"),
    commitmentId: z.string().describe("ID of the commitment this coaching is for"),
  }),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type Commitment = z.infer<typeof CommitmentSchema>;
export type UserContext = z.infer<typeof UserContextSchema>;
export type CommitmentCoachInput = z.infer<typeof CommitmentCoachInputSchema>;
export type CommitmentCoachOutput = z.infer<typeof CommitmentCoachOutputSchema>;
export type RiskLevel = z.infer<typeof RiskLevelEnum>;

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateTimeRemaining(deadlineAt: string, currentTime: string) {
  const deadline = new Date(deadlineAt).getTime();
  const now = new Date(currentTime).getTime();
  const diffMs = deadline - now;

  const hoursRemaining = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
  const daysRemaining = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  return { hoursRemaining, daysRemaining, isOverdue: diffMs < 0 };
}

function calculateProgress(currentMilestone: Milestone, milestonesCompleted: Milestone[]) {
  const currentIndex = MILESTONE_ORDER.indexOf(currentMilestone);
  const totalMilestones = MILESTONE_ORDER.length - 1; // Exclude 'completed' as it's the end state
  const milestonesRemaining = Math.max(0, totalMilestones - currentIndex);
  const percentComplete = Math.round((currentIndex / totalMilestones) * 100);

  return { milestonesRemaining, percentComplete };
}

function determineRiskLevel(
  daysRemaining: number,
  hoursRemaining: number,
  currentMilestone: Milestone,
  isOverdue: boolean
): RiskLevel {
  if (isOverdue) return "critical";
  if (currentMilestone === "completed") return "on_track";

  const milestoneIndex = MILESTONE_ORDER.indexOf(currentMilestone);

  // Critical: Less than 24 hours and not even working on solution
  if (hoursRemaining < 24 && milestoneIndex < 3) return "critical";

  // At risk: Less than 2 days and haven't started working
  if (daysRemaining < 2 && milestoneIndex < 3) return "at_risk";

  // Needs attention: Less than 4 days and still in early stages
  if (daysRemaining < 4 && milestoneIndex < 2) return "needs_attention";

  // At risk: More than half time gone but less than half progress
  if (daysRemaining < 3.5 && milestoneIndex < 2) return "needs_attention";

  return "on_track";
}

// ============================================
// AGENT FLOW
// ============================================

export const commitmentCoachFlow = ai.defineFlow(
  {
    name: "commitmentCoachFlow",
    inputSchema: CommitmentCoachInputSchema,
    outputSchema: CommitmentCoachOutputSchema,
  },
  async (input) => {
    const { commitment, user } = input;
    const currentTime = input.currentTime || new Date().toISOString();

    // Calculate time and progress metrics
    const { hoursRemaining, daysRemaining, isOverdue } = calculateTimeRemaining(
      commitment.deadlineAt,
      currentTime
    );
    const { milestonesRemaining, percentComplete } = calculateProgress(
      commitment.currentMilestone,
      commitment.milestonesCompleted
    );
    const riskLevel = determineRiskLevel(
      daysRemaining,
      hoursRemaining,
      commitment.currentMilestone,
      isOverdue
    );

    // Build the coaching prompt
    const systemPrompt = `You are a supportive but honest commitment coach for open source contributors. Your personality is:
- Encouraging but realistic
- Warm but not patronizing
- Action-oriented and specific
- Aware of time pressure without being anxiety-inducing

Your job is to help ${user.username} successfully complete their commitment to contribute to an open source issue.

MILESTONE JOURNEY:
1. not_started → User hasn't begun
2. read_issue → User has read and understood the issue
3. ask_question → User has asked clarifying questions (or confirmed none needed)
4. work_on_solution → User is actively coding/working
5. open_pr → User has opened a pull request
6. completed → PR merged or commitment fulfilled

COACHING PRINCIPLES:
- Each milestone matters. Don't skip steps.
- "ask_question" is crucial - clarifying before coding saves time
- Be specific about what to do next, not vague
- Acknowledge effort and progress
- If risk is high, be direct but not discouraging
- Tailor your tone to the situation`;

    const situationContext = `
## CURRENT SITUATION

**User:** ${user.username}
${user.completedCommitments !== undefined ? `**Track record:** ${user.completedCommitments} completed commitments` : ""}
${user.totalCommitments !== undefined ? `**Active commitments:** ${user.totalCommitments}` : ""}

**Commitment Details:**
- Issue: "${commitment.issueTitle}"
- Repository: ${commitment.repository}
- URL: ${commitment.issueUrl}

**Progress:**
- Current milestone: ${commitment.currentMilestone}
- Milestones completed: ${commitment.milestonesCompleted.join(", ") || "None yet"}
- Progress: ${percentComplete}% complete

**Time Status:**
- Days remaining: ${daysRemaining}
- Hours remaining: ${hoursRemaining}
- Risk level: ${riskLevel}
- Is overdue: ${isOverdue}
${commitment.lastActivityAt ? `- Last activity: ${commitment.lastActivityAt}` : "- No recent activity recorded"}
`;

    const prompt = `${systemPrompt}

${situationContext}

Based on this situation, provide coaching guidance. Think like a supportive mentor who wants this person to succeed.

Respond with ONLY a valid JSON object (no markdown, no code blocks) in this exact format:
{
  "nextAction": {
    "action": "Specific action to take right now",
    "why": "Why this matters",
    "estimatedMinutes": 15
  },
  "nudge": {
    "message": "Your encouraging coach message here",
    "tone": "encouraging" | "motivating" | "celebratory" | "urgent" | "supportive"
  },
  "riskReason": "Why this risk level applies",
  "warning": {
    "message": "Warning message (only if at_risk or critical)",
    "suggestion": "How to get back on track"
  }
}

Note: Only include "warning" if the risk level is "at_risk" or "critical".
Choose the nudge tone based on the situation:
- "encouraging" for normal progress
- "motivating" for slow progress
- "celebratory" for good progress or milestones achieved
- "urgent" for critical situations
- "supportive" for struggling users`;

    const response = await ai.generate({ prompt });
    const text = response.text.trim();

    // Parse LLM response
    let llmOutput: {
      nextAction: { action: string; why: string; estimatedMinutes?: number };
      nudge: { message: string; tone: string };
      riskReason: string;
      warning?: { message: string; suggestion: string };
    };

    try {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : text;
      llmOutput = JSON.parse(jsonStr);
    } catch {
      // Fallback response
      llmOutput = {
        nextAction: {
          action: getDefaultAction(commitment.currentMilestone),
          why: "This is the natural next step in your contribution journey.",
          estimatedMinutes: 15,
        },
        nudge: {
          message: `Hey ${user.username}, you've got this! Every step forward counts.`,
          tone: "encouraging",
        },
        riskReason: "Unable to fully analyze - please review your timeline.",
      };
    }

    // Build the structured output
    const result: CommitmentCoachOutput = {
      nextAction: {
        action: llmOutput.nextAction.action,
        why: llmOutput.nextAction.why,
        estimatedMinutes: llmOutput.nextAction.estimatedMinutes,
      },
      nudge: {
        message: llmOutput.nudge.message,
        tone: validateTone(llmOutput.nudge.tone),
      },
      riskAssessment: {
        level: riskLevel,
        reason: llmOutput.riskReason,
        daysRemaining,
        hoursRemaining,
      },
      progress: {
        currentMilestone: commitment.currentMilestone,
        milestonesRemaining,
        percentComplete,
      },
      meta: {
        generatedAt: new Date().toISOString(),
        commitmentId: commitment.id,
      },
    };

    // Only add warning if risk is elevated
    if ((riskLevel === "at_risk" || riskLevel === "critical") && llmOutput.warning) {
      result.warning = {
        message: llmOutput.warning.message,
        suggestion: llmOutput.warning.suggestion,
      };
    }

    // Log to Opik for observability
    const trace = opikClient.trace({
      name: "commitmentCoachFlow",
      input: {
        username: user.username,
        milestone: commitment.currentMilestone,
        daysRemaining,
        riskLevel,
      },
      output: result,
    });
    trace.end();
    await opikClient.flush();

    return result;
  }
);

// ============================================
// HELPER: DEFAULT ACTIONS
// ============================================

function getDefaultAction(milestone: Milestone): string {
  const actions: Record<Milestone, string> = {
    not_started: "Open the GitHub issue and read through it carefully, including all comments.",
    read_issue:
      "Think about any questions you have. If unclear on anything, post a clarifying comment on the issue.",
    ask_question:
      "Start working on the solution. Set up your local environment and make your first code change.",
    work_on_solution:
      "Continue your implementation. Once ready, open a draft PR to get early feedback.",
    open_pr: "Address any PR feedback and ensure all checks pass.",
    completed: "Celebrate! Consider picking your next issue to contribute to.",
  };
  return actions[milestone];
}

function validateTone(
  tone: string
): "encouraging" | "motivating" | "celebratory" | "urgent" | "supportive" {
  const validTones = ["encouraging", "motivating", "celebratory", "urgent", "supportive"] as const;
  return validTones.includes(tone as (typeof validTones)[number])
    ? (tone as (typeof validTones)[number])
    : "encouraging";
}
