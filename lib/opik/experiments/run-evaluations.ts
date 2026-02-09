import { Opik } from "opik";
import {
  issueRecommenderTestCases,
  commitmentCoachTestCases,
  issueExplainerTestCases,
} from "../evaluations/datasets";
import { recommendIssueFlow } from "../../ai/agents/recommend-issue";
import { commitmentCoachFlow } from "../../ai/agents/commitment-coach";
import { issueExplainerFlow } from "../../ai/agents/issue-explainer";
import {
  judgeIssueRecommendation,
  judgeCoachingQuality,
  judgeExplanationQuality,
  calculateAverageScores,
  type IssueRecommenderJudgeResult,
  type CommitmentCoachJudgeResult,
  type IssueExplainerJudgeResult,
} from "../evaluations/judges";

// ============================================
// CONFIGURATION
// ============================================

const opik = new Opik();
const EXPERIMENT_PREFIX = "nilla-eval";
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

// ============================================
// RESULT TYPES
// ============================================

interface EvaluationResult<T> {
  testName: string;
  scores: T;
  output: unknown;
  durationMs: number;
}

export interface AgentEvaluationSummary {
  agentName: string;
  totalTests: number;
  averageScores: Record<string, number>;
  results: EvaluationResult<unknown>[];
  totalDurationMs: number;
}

// ============================================
// ISSUE RECOMMENDER EVALUATION
// ============================================

async function evaluateIssueRecommender(): Promise<AgentEvaluationSummary> {
  console.log("\n" + "=".repeat(60));
  console.log("🎯 EVALUATING ISSUE RECOMMENDER");
  console.log("=".repeat(60));

  const results: EvaluationResult<IssueRecommenderJudgeResult>[] = [];
  const experimentName = `${EXPERIMENT_PREFIX}-issue-recommender-${timestamp}`;

  for (let i = 0; i < issueRecommenderTestCases.length; i++) {
    const testCase = issueRecommenderTestCases[i];
    console.log(
      `\n[${i + 1}/${issueRecommenderTestCases.length}] ${testCase.name}`,
    );

    const startTime = Date.now();

    try {
      // Run the agent
      const output = await recommendIssueFlow(testCase.input);

      // Judge the output
      const scores = await judgeIssueRecommendation(
        testCase.input,
        output,
        testCase.expectedBehavior,
      );

      const durationMs = Date.now() - startTime;

      // Log to Opik with full input/output for proper evaluation
      const trace = opik.trace({
        name: `eval-issue-recommender-${i + 1}`,
        input: {
          testName: testCase.name,
          expectedBehavior: testCase.expectedBehavior,
          user: testCase.input.user,
          issues: testCase.input.issues.map((i) => ({
            id: i.id,
            title: i.title,
            labels: i.labels,
            language: i.language,
          })),
        },
        output: {
          recommendedIssue: output.recommendedIssue,
          explanation: output.explanation,
          riskLevel: output.riskLevel,
          riskFactors: output.riskFactors,
          alternativeIssues: output.alternativeIssues,
          rankedIssues: output.rankedIssues,
        },
        tags: ["evaluation", "issue-recommender", experimentName],
      });

      // Log scores as feedback
      trace.score({
        name: "match_quality",
        value: scores.matchQuality,
        categoryName: "issue-recommender",
        reason: scores.reasoning,
      });
      trace.score({
        name: "difficulty_calibration",
        value: scores.difficultyCalibration,
        categoryName: "issue-recommender",
      });
      trace.score({
        name: "explanation_clarity",
        value: scores.explanationClarity,
        categoryName: "issue-recommender",
      });
      trace.score({
        name: "risk_assessment",
        value: scores.riskAssessment,
        categoryName: "issue-recommender",
      });
      trace.score({
        name: "overall_score",
        value: scores.overallScore,
        categoryName: "issue-recommender",
      });

      trace.end();

      results.push({
        testName: testCase.name,
        scores,
        output,
        durationMs,
      });

      const scoreEmoji =
        scores.overallScore >= 4
          ? "✅"
          : scores.overallScore >= 3
            ? "⚠️"
            : "❌";
      console.log(
        `   ${scoreEmoji} Score: ${scores.overallScore}/5 | Match: ${scores.matchQuality} | Difficulty: ${scores.difficultyCalibration} | Clarity: ${scores.explanationClarity}`,
      );
      console.log(`   📝 ${scores.reasoning}`);
    } catch (error) {
      console.error(`   ❌ Error: ${error}`);
      results.push({
        testName: testCase.name,
        scores: {
          matchQuality: 0,
          difficultyCalibration: 0,
          explanationClarity: 0,
          riskAssessment: 0,
          overallScore: 0,
          reasoning: `Error: ${error}`,
        },
        output: null,
        durationMs: Date.now() - startTime,
      });
    }
  }

  const averageScores = calculateAverageScores(
    results.map((r) => r.scores as unknown as Record<string, string | number>),
  );
  const totalDurationMs = results.reduce((sum, r) => sum + r.durationMs, 0);

  console.log("\n" + "-".repeat(40));
  console.log("📊 ISSUE RECOMMENDER SUMMARY");
  console.log(`   Average Overall Score: ${averageScores.overallScore}/5`);
  console.log(`   Match Quality: ${averageScores.matchQuality}/5`);
  console.log(
    `   Difficulty Calibration: ${averageScores.difficultyCalibration}/5`,
  );
  console.log(`   Explanation Clarity: ${averageScores.explanationClarity}/5`);
  console.log(`   Risk Assessment: ${averageScores.riskAssessment}/5`);
  console.log(`   Total Duration: ${(totalDurationMs / 1000).toFixed(1)}s`);

  return {
    agentName: "Issue Recommender",
    totalTests: results.length,
    averageScores,
    results,
    totalDurationMs,
  };
}

// ============================================
// COMMITMENT COACH EVALUATION
// ============================================

async function evaluateCommitmentCoach(): Promise<AgentEvaluationSummary> {
  console.log("\n" + "=".repeat(60));
  console.log("🏋️ EVALUATING COMMITMENT COACH");
  console.log("=".repeat(60));

  const results: EvaluationResult<CommitmentCoachJudgeResult>[] = [];
  const experimentName = `${EXPERIMENT_PREFIX}-commitment-coach-${timestamp}`;

  for (let i = 0; i < commitmentCoachTestCases.length; i++) {
    const testCase = commitmentCoachTestCases[i];
    console.log(
      `\n[${i + 1}/${commitmentCoachTestCases.length}] ${testCase.name}`,
    );

    const startTime = Date.now();

    try {
      // Run the agent
      const output = await commitmentCoachFlow(testCase.input);

      // Judge the output
      const scores = await judgeCoachingQuality(
        testCase.input,
        output,
        testCase.expectedBehavior,
      );

      const durationMs = Date.now() - startTime;

      // Log to Opik with full input/output for proper evaluation
      const trace = opik.trace({
        name: `eval-commitment-coach-${i + 1}`,
        input: {
          testName: testCase.name,
          expectedBehavior: testCase.expectedBehavior,
          commitment: testCase.input.commitment,
          user: testCase.input.user,
        },
        output: {
          nextAction: output.nextAction,
          nudge: output.nudge,
          riskAssessment: output.riskAssessment,
          warning: output.warning,
          progress: output.progress,
        },
        tags: ["evaluation", "commitment-coach", experimentName],
      });

      // Log scores as feedback
      trace.score({
        name: "tone_appropriateness",
        value: scores.toneAppropriateness,
        categoryName: "commitment-coach",
        reason: scores.reasoning,
      });
      trace.score({
        name: "actionability",
        value: scores.actionability,
        categoryName: "commitment-coach",
      });
      trace.score({
        name: "risk_accuracy",
        value: scores.riskAccuracy,
        categoryName: "commitment-coach",
      });
      trace.score({
        name: "urgency_calibration",
        value: scores.urgencyCalibration,
        categoryName: "commitment-coach",
      });
      trace.score({
        name: "overall_score",
        value: scores.overallScore,
        categoryName: "commitment-coach",
      });

      trace.end();

      results.push({
        testName: testCase.name,
        scores,
        output,
        durationMs,
      });

      const scoreEmoji =
        scores.overallScore >= 4
          ? "✅"
          : scores.overallScore >= 3
            ? "⚠️"
            : "❌";
      console.log(
        `   ${scoreEmoji} Score: ${scores.overallScore}/5 | Tone: ${scores.toneAppropriateness} | Action: ${scores.actionability} | Risk: ${scores.riskAccuracy}`,
      );
      console.log(`   📝 ${scores.reasoning}`);
    } catch (error) {
      console.error(`   ❌ Error: ${error}`);
      results.push({
        testName: testCase.name,
        scores: {
          toneAppropriateness: 0,
          actionability: 0,
          riskAccuracy: 0,
          urgencyCalibration: 0,
          overallScore: 0,
          reasoning: `Error: ${error}`,
        },
        output: null,
        durationMs: Date.now() - startTime,
      });
    }
  }

  const averageScores = calculateAverageScores(
    results.map((r) => r.scores as unknown as Record<string, string | number>),
  );
  const totalDurationMs = results.reduce((sum, r) => sum + r.durationMs, 0);

  console.log("\n" + "-".repeat(40));
  console.log("📊 COMMITMENT COACH SUMMARY");
  console.log(`   Average Overall Score: ${averageScores.overallScore}/5`);
  console.log(
    `   Tone Appropriateness: ${averageScores.toneAppropriateness}/5`,
  );
  console.log(`   Actionability: ${averageScores.actionability}/5`);
  console.log(`   Risk Accuracy: ${averageScores.riskAccuracy}/5`);
  console.log(`   Urgency Calibration: ${averageScores.urgencyCalibration}/5`);
  console.log(`   Total Duration: ${(totalDurationMs / 1000).toFixed(1)}s`);

  return {
    agentName: "Commitment Coach",
    totalTests: results.length,
    averageScores,
    results,
    totalDurationMs,
  };
}

// ============================================
// ISSUE EXPLAINER EVALUATION
// ============================================

async function evaluateIssueExplainer(): Promise<AgentEvaluationSummary> {
  console.log("\n" + "=".repeat(60));
  console.log("📖 EVALUATING ISSUE EXPLAINER");
  console.log("=".repeat(60));

  const results: EvaluationResult<IssueExplainerJudgeResult>[] = [];
  const experimentName = `${EXPERIMENT_PREFIX}-issue-explainer-${timestamp}`;

  for (let i = 0; i < issueExplainerTestCases.length; i++) {
    const testCase = issueExplainerTestCases[i];
    console.log(
      `\n[${i + 1}/${issueExplainerTestCases.length}] ${testCase.name}`,
    );

    const startTime = Date.now();

    try {
      // Run the agent
      const output = await issueExplainerFlow(testCase.input);

      // Judge the output
      const scores = await judgeExplanationQuality(
        testCase.input,
        output,
        testCase.expectedBehavior,
      );

      const durationMs = Date.now() - startTime;

      // Log to Opik with full input/output for proper evaluation
      const trace = opik.trace({
        name: `eval-issue-explainer-${i + 1}`,
        input: {
          testName: testCase.name,
          expectedBehavior: testCase.expectedBehavior,
          issue: testCase.input.issue,
          user: testCase.input.user,
          hasRagContext: !!testCase.input.repoContext,
        },
        output: {
          summary: output.summary,
          expectedOutcome: output.expectedOutcome,
          suggestedApproach: output.suggestedApproach,
          repoGuidelines: output.repoGuidelines,
          beginnerPitfalls: output.beginnerPitfalls,
          keyTerms: output.keyTerms,
          confidenceNote: output.confidenceNote,
        },
        tags: ["evaluation", "issue-explainer", experimentName],
      });

      // Log scores as feedback
      trace.score({
        name: "clarity",
        value: scores.clarity,
        categoryName: "issue-explainer",
        reason: scores.reasoning,
      });
      trace.score({
        name: "accuracy",
        value: scores.accuracy,
        categoryName: "issue-explainer",
      });
      trace.score({
        name: "level_appropriateness",
        value: scores.levelAppropriateness,
        categoryName: "issue-explainer",
      });
      trace.score({
        name: "actionability",
        value: scores.actionability,
        categoryName: "issue-explainer",
      });
      trace.score({
        name: "overall_score",
        value: scores.overallScore,
        categoryName: "issue-explainer",
      });

      trace.end();

      results.push({
        testName: testCase.name,
        scores,
        output,
        durationMs,
      });

      const scoreEmoji =
        scores.overallScore >= 4
          ? "✅"
          : scores.overallScore >= 3
            ? "⚠️"
            : "❌";
      console.log(
        `   ${scoreEmoji} Score: ${scores.overallScore}/5 | Clarity: ${scores.clarity} | Level: ${scores.levelAppropriateness} | Action: ${scores.actionability}`,
      );
      console.log(`   📝 ${scores.reasoning}`);
    } catch (error) {
      console.error(`   ❌ Error: ${error}`);
      results.push({
        testName: testCase.name,
        scores: {
          clarity: 0,
          accuracy: 0,
          levelAppropriateness: 0,
          actionability: 0,
          overallScore: 0,
          reasoning: `Error: ${error}`,
        },
        output: null,
        durationMs: Date.now() - startTime,
      });
    }
  }

  const averageScores = calculateAverageScores(
    results.map((r) => r.scores as unknown as Record<string, string | number>),
  );
  const totalDurationMs = results.reduce((sum, r) => sum + r.durationMs, 0);

  console.log("\n" + "-".repeat(40));
  console.log("📊 ISSUE EXPLAINER SUMMARY");
  console.log(`   Average Overall Score: ${averageScores.overallScore}/5`);
  console.log(`   Clarity: ${averageScores.clarity}/5`);
  console.log(`   Accuracy: ${averageScores.accuracy}/5`);
  console.log(
    `   Level Appropriateness: ${averageScores.levelAppropriateness}/5`,
  );
  console.log(`   Actionability: ${averageScores.actionability}/5`);
  console.log(`   Total Duration: ${(totalDurationMs / 1000).toFixed(1)}s`);

  return {
    agentName: "Issue Explainer",
    totalTests: results.length,
    averageScores,
    results,
    totalDurationMs,
  };
}

// ============================================
// MAIN RUNNER
// ============================================

async function main() {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     🚀 NILLA AI AGENT EVALUATION SUITE                     ║");
  console.log("║     LLM-as-Judge Evaluation with Opik Tracing              ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log(`\n📅 Timestamp: ${timestamp}`);
  console.log(
    `📊 Test Cases: ${issueRecommenderTestCases.length + commitmentCoachTestCases.length + issueExplainerTestCases.length} total`,
  );

  const startTime = Date.now();

  // Run all evaluations
  const issueRecResults = await evaluateIssueRecommender();
  const coachResults = await evaluateCommitmentCoach();
  const explainerResults = await evaluateIssueExplainer();

  // Flush all traces to Opik
  await opik.flush();

  const totalDuration = Date.now() - startTime;

  // Final Summary
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                    📊 FINAL RESULTS                        ║");
  console.log("╠════════════════════════════════════════════════════════════╣");
  console.log(
    `║  Issue Recommender:  ${issueRecResults.averageScores.overallScore?.toFixed(2) || "N/A"}/5  (${issueRecResults.totalTests} tests)`.padEnd(
      61,
    ) + "║",
  );
  console.log(
    `║  Commitment Coach:   ${coachResults.averageScores.overallScore?.toFixed(2) || "N/A"}/5  (${coachResults.totalTests} tests)`.padEnd(
      61,
    ) + "║",
  );
  console.log(
    `║  Issue Explainer:    ${explainerResults.averageScores.overallScore?.toFixed(2) || "N/A"}/5  (${explainerResults.totalTests} tests)`.padEnd(
      61,
    ) + "║",
  );
  console.log("╠════════════════════════════════════════════════════════════╣");

  const overallAverage =
    ((issueRecResults.averageScores.overallScore || 0) +
      (coachResults.averageScores.overallScore || 0) +
      (explainerResults.averageScores.overallScore || 0)) /
    3;

  console.log(
    `║  Overall Average:    ${overallAverage.toFixed(2)}/5`.padEnd(61) + "║",
  );
  console.log(
    `║  Total Duration:     ${(totalDuration / 1000).toFixed(1)}s`.padEnd(61) +
      "║",
  );
  console.log("╚════════════════════════════════════════════════════════════╝");

  console.log("\n✅ Evaluations complete!");
  console.log("📈 Check Opik dashboard for detailed traces and metrics.");
  console.log(`   Filter by tag: ${EXPERIMENT_PREFIX}-*-${timestamp}\n`);

  // Return results for programmatic use
  return {
    issueRecommender: issueRecResults,
    commitmentCoach: coachResults,
    issueExplainer: explainerResults,
    overallAverage,
    totalDuration,
  };
}

// Run the evaluations
main().catch(console.error);
