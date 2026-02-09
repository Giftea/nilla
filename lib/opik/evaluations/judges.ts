import OpenAI from "openai";
import type { RecommendIssueInput, RecommendIssueOutput } from "@/lib/ai/agents/recommend-issue";
import type { CommitmentCoachInput, CommitmentCoachOutput } from "@/lib/ai/agents/commitment-coach";
import type { IssueExplainerInput, IssueExplainerOutput } from "@/lib/ai/agents/issue-explainer";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================
// JUDGE RESULT TYPES
// ============================================

export interface IssueRecommenderJudgeResult {
  matchQuality: number; // 1-5: Does the issue fit the user?
  difficultyCalibration: number; // 1-5: Are difficulty scores accurate?
  explanationClarity: number; // 1-5: Is the explanation helpful?
  riskAssessment: number; // 1-5: Is the risk level appropriate?
  overallScore: number; // 1-5: Overall recommendation quality
  reasoning: string;
}

export interface CommitmentCoachJudgeResult {
  toneAppropriateness: number; // 1-5: Is the tone right for the situation?
  actionability: number; // 1-5: Is the next action specific and doable?
  riskAccuracy: number; // 1-5: Is the risk assessment correct?
  urgencyCalibration: number; // 1-5: Does urgency match the deadline?
  overallScore: number; // 1-5: Overall coaching quality
  reasoning: string;
}

export interface IssueExplainerJudgeResult {
  clarity: number; // 1-5: Is the explanation clear?
  accuracy: number; // 1-5: Is the information accurate?
  levelAppropriateness: number; // 1-5: Does it match user's experience level?
  actionability: number; // 1-5: Does it help the user get started?
  overallScore: number; // 1-5: Overall explanation quality
  reasoning: string;
}

// ============================================
// ISSUE RECOMMENDER JUDGE
// ============================================

export async function judgeIssueRecommendation(
  input: RecommendIssueInput,
  output: RecommendIssueOutput,
  expectedBehavior: string
): Promise<IssueRecommenderJudgeResult> {
  const issuesSummary = input.issues
    .map((i) => `- ID: ${i.id}, Title: "${i.title}", Labels: [${i.labels.join(", ")}], Language: ${i.language || "N/A"}`)
    .join("\n");

  const rankedSummary = output.rankedIssues
    .slice(0, 5)
    .map((r) => `- ${r.issueId}: difficulty=${r.difficultyScore}, fit=${r.fitScore}, "${r.reasoning}"`)
    .join("\n");

  const judgePrompt = `You are an expert evaluator assessing an AI agent that recommends GitHub issues to contributors.

## USER PROFILE
- Username: ${input.user.username}
- Skill Level: ${input.user.skillLevel}
- Preferred Languages: ${input.user.preferredLanguages.join(", ")}
- Past Contributions: ${input.user.pastContributions || 0}
- Interests: ${input.user.interests?.join(", ") || "Not specified"}
- Available Hours/Week: ${input.user.availableHoursPerWeek || "Not specified"}

## AVAILABLE ISSUES
${issuesSummary}

## AGENT'S RECOMMENDATION
- Recommended Issue: "${output.recommendedIssue.title}" (ID: ${output.recommendedIssue.id})
- Repository: ${output.recommendedIssue.repository}
- Explanation: ${output.explanation}
- Risk Level: ${output.riskLevel}
- Risk Factors: ${output.riskFactors.join("; ")}
- Alternative Issues: ${output.alternativeIssues.map((a) => `${a.title}: ${a.reason}`).join("; ") || "None"}

## RANKED ISSUES (Top 5)
${rankedSummary}

## EXPECTED BEHAVIOR
${expectedBehavior}

## EVALUATION CRITERIA
Rate each criterion from 1 (poor) to 5 (excellent):

1. **Match Quality**: Does the recommended issue actually fit this user's skill level, language preferences, and interests? A beginner shouldn't get complex issues; an advanced user shouldn't get trivial ones.

2. **Difficulty Calibration**: Are the difficulty scores (1-10) accurate? good-first-issue should be low difficulty; complex features should be high.

3. **Explanation Clarity**: Does the explanation clearly articulate WHY this issue is a good fit? Is it specific to this user?

4. **Risk Assessment**: Is the risk level (low/medium/high) appropriate? Are the risk factors relevant?

5. **Overall Score**: Holistic assessment of recommendation quality.

Respond with ONLY valid JSON (no markdown code blocks):
{
  "matchQuality": <1-5>,
  "difficulty_calibration": <1-5>,
  "explanation_clarity": <1-5>,
  "risk_assessment": <1-5>,
  "overall_score": <1-5>,
  "reasoning": "<2-3 sentences explaining your scores>"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: judgePrompt }],
    temperature: 0.3,
    max_tokens: 500,
  });

  const text = response.choices[0]?.message?.content?.trim() ?? "{}";

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return {
      matchQuality: clampScore(parsed.matchQuality),
      difficultyCalibration: clampScore(parsed.difficultyCalibration),
      explanationClarity: clampScore(parsed.explanationClarity),
      riskAssessment: clampScore(parsed.riskAssessment),
      overallScore: clampScore(parsed.overallScore),
      reasoning: parsed.reasoning || "No reasoning provided",
    };
  } catch {
    return {
      matchQuality: 3,
      difficultyCalibration: 3,
      explanationClarity: 3,
      riskAssessment: 3,
      overallScore: 3,
      reasoning: "Failed to parse judge output: " + text.slice(0, 100),
    };
  }
}

// ============================================
// COMMITMENT COACH JUDGE
// ============================================

export async function judgeCoachingQuality(
  input: CommitmentCoachInput,
  output: CommitmentCoachOutput,
  expectedBehavior: string
): Promise<CommitmentCoachJudgeResult> {
  const daysElapsed = Math.floor(
    (new Date(input.currentTime || Date.now()).getTime() -
      new Date(input.commitment.createdAt).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const judgePrompt = `You are an expert evaluator assessing an AI commitment coach for open source contributors.

## COMMITMENT CONTEXT
- Issue: "${input.commitment.issueTitle}"
- Repository: ${input.commitment.repository}
- Days Elapsed: ${daysElapsed} of 7
- Days Remaining: ${output.riskAssessment.daysRemaining}
- Hours Remaining: ${output.riskAssessment.hoursRemaining}
- Current Milestone: ${input.commitment.currentMilestone}
- Milestones Completed: [${input.commitment.milestonesCompleted.join(", ")}]
- Last Activity: ${input.commitment.lastActivityAt || "Not recorded"}

## USER CONTEXT
- Username: ${input.user.username}
- Completed Commitments: ${input.user.completedCommitments ?? "Unknown"}
- Total Commitments: ${input.user.totalCommitments ?? "Unknown"}

## AGENT'S COACHING OUTPUT
- Next Action: "${output.nextAction.action}"
- Why: "${output.nextAction.why}"
- Estimated Minutes: ${output.nextAction.estimatedMinutes || "Not specified"}
- Nudge Message: "${output.nudge.message}"
- Nudge Tone: ${output.nudge.tone}
- Risk Level: ${output.riskAssessment.level}
- Risk Reason: "${output.riskAssessment.reason}"
- Progress: ${output.progress.percentComplete}% complete, ${output.progress.milestonesRemaining} milestones remaining
${output.warning ? `- Warning: "${output.warning.message}" | Suggestion: "${output.warning.suggestion}"` : "- No warning issued"}

## EXPECTED BEHAVIOR
${expectedBehavior}

## MILESTONE JOURNEY (for reference)
not_started → read_issue → ask_question → work_on_solution → open_pr → completed

## EVALUATION CRITERIA
Rate each criterion from 1 (poor) to 5 (excellent):

1. **Tone Appropriateness**: Does the tone match the situation? Urgent situations need urgency; early progress deserves encouragement; completed work deserves celebration. Is it supportive without being condescending?

2. **Actionability**: Is the next action specific and immediately doable? "Work on it" is vague; "Open the issue and read all comments" is specific.

3. **Risk Accuracy**: Is the risk level correct given the time remaining and progress? Less than 2 days with no work started should be at_risk or critical.

4. **Urgency Calibration**: Does the urgency conveyed match the actual deadline pressure? Users shouldn't feel panic on day 1, but should feel urgency on day 6 with no progress.

5. **Overall Score**: Holistic assessment of coaching quality.

Respond with ONLY valid JSON (no markdown code blocks):
{
  "toneAppropriateness": <1-5>,
  "actionability": <1-5>,
  "riskAccuracy": <1-5>,
  "urgencyCalibration": <1-5>,
  "overallScore": <1-5>,
  "reasoning": "<2-3 sentences explaining your scores>"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: judgePrompt }],
    temperature: 0.3,
    max_tokens: 500,
  });

  const text = response.choices[0]?.message?.content?.trim() ?? "{}";

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return {
      toneAppropriateness: clampScore(parsed.toneAppropriateness),
      actionability: clampScore(parsed.actionability),
      riskAccuracy: clampScore(parsed.riskAccuracy),
      urgencyCalibration: clampScore(parsed.urgencyCalibration),
      overallScore: clampScore(parsed.overallScore),
      reasoning: parsed.reasoning || "No reasoning provided",
    };
  } catch {
    return {
      toneAppropriateness: 3,
      actionability: 3,
      riskAccuracy: 3,
      urgencyCalibration: 3,
      overallScore: 3,
      reasoning: "Failed to parse judge output: " + text.slice(0, 100),
    };
  }
}

// ============================================
// ISSUE EXPLAINER JUDGE
// ============================================

export async function judgeExplanationQuality(
  input: IssueExplainerInput,
  output: IssueExplainerOutput,
  expectedBehavior: string
): Promise<IssueExplainerJudgeResult> {
  const keyTermsList = output.keyTerms
    .map((kt) => `"${kt.term}": ${kt.definition}`)
    .join("\n");

  const judgePrompt = `You are an expert evaluator assessing an AI that explains GitHub issues to contributors.

## ISSUE DETAILS
- Title: "${input.issue.title}"
- Repository: ${input.issue.repository}
- Labels: [${input.issue.labels.join(", ")}]
- Body: "${input.issue.body?.slice(0, 500) || "No description"}${input.issue.body && input.issue.body.length > 500 ? "..." : ""}"

## USER CONTEXT
- Experience Level: ${input.user.experienceLevel}

## RAG CONTEXT PROVIDED
${input.repoContext ? "Yes - Repository documentation was available" : "No - No repository documentation was provided"}

## AGENT'S EXPLANATION OUTPUT
- Summary: "${output.summary}"
- Expected Outcome: "${output.expectedOutcome}"
- Suggested Approach: "${output.suggestedApproach}"
- Repo Guidelines: [${output.repoGuidelines.join("; ") || "None"}]
- Beginner Pitfalls: [${output.beginnerPitfalls.join("; ") || "None"}]
- Key Terms Defined:
${keyTermsList || "None"}
- Confidence Note: "${output.confidenceNote}"

## EXPECTED BEHAVIOR
${expectedBehavior}

## EVALUATION CRITERIA
Rate each criterion from 1 (poor) to 5 (excellent):

1. **Clarity**: Is the explanation clear and well-structured? Can someone understand what the issue is about?

2. **Accuracy**: Is the information accurate? Does it correctly interpret the issue? If no RAG context was provided, repoGuidelines should be empty (no hallucination).

3. **Level Appropriateness**: Does the explanation match the user's experience level?
   - Beginners: Simple language, defines jargon, thorough explanations
   - Intermediate: Clear but not overly basic, focuses on specifics
   - Advanced: Concise, skips basics, focuses on nuances

4. **Actionability**: Does the explanation help the user get started? Is the suggested approach practical and specific?

5. **Overall Score**: Holistic assessment of explanation quality.

Respond with ONLY valid JSON (no markdown code blocks):
{
  "clarity": <1-5>,
  "accuracy": <1-5>,
  "levelAppropriateness": <1-5>,
  "actionability": <1-5>,
  "overallScore": <1-5>,
  "reasoning": "<2-3 sentences explaining your scores>"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: judgePrompt }],
    temperature: 0.3,
    max_tokens: 500,
  });

  const text = response.choices[0]?.message?.content?.trim() ?? "{}";

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    return {
      clarity: clampScore(parsed.clarity),
      accuracy: clampScore(parsed.accuracy),
      levelAppropriateness: clampScore(parsed.levelAppropriateness),
      actionability: clampScore(parsed.actionability),
      overallScore: clampScore(parsed.overallScore),
      reasoning: parsed.reasoning || "No reasoning provided",
    };
  } catch {
    return {
      clarity: 3,
      accuracy: 3,
      levelAppropriateness: 3,
      actionability: 3,
      overallScore: 3,
      reasoning: "Failed to parse judge output: " + text.slice(0, 100),
    };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function clampScore(score: number): number {
  if (typeof score !== "number" || isNaN(score)) return 3;
  return Math.max(1, Math.min(5, Math.round(score)));
}

// ============================================
// AGGREGATE SCORING
// ============================================

export function calculateAverageScores<T extends Record<string, number | string>>(
  results: T[]
): Record<string, number> {
  if (results.length === 0) return {};

  const numericKeys = Object.keys(results[0]).filter(
    (key) => typeof results[0][key] === "number"
  );

  const averages: Record<string, number> = {};

  for (const key of numericKeys) {
    const sum = results.reduce((acc, r) => acc + (r[key] as number), 0);
    averages[key] = Number((sum / results.length).toFixed(2));
  }

  return averages;
}
