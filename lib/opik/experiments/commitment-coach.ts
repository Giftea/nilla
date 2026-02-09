import { commitmentCoachTestCases } from "../evaluations/datasets";
import {
  commitmentCoachFlow,
  CommitmentCoachInput,
  CommitmentCoachOutput,
} from "../../ai/agents/commitment-coach";
import {
  judgeCoachingQuality,
  calculateAverageScores,
  type CommitmentCoachJudgeResult,
} from "../evaluations/judges";
import {
  evaluate,
  EvaluationTask,
  Opik,
  BaseMetric,
  EvaluationScoreResult,
} from "opik";

const EXPERIMENT_PREFIX = "nilla-eval";
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

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

import { z } from "zod";

// Define the validation schema for the metric inputs
const coachingQualityValidationSchema = z.object({
  input: z.object({
    commitment: z.any(),
    user: z.any(),
  }),
  output: z
    .object({
      nextAction: z.any().optional(),
      nudge: z.any().optional(),
      riskAssessment: z.any().optional(),
      warning: z.any().optional(),
      progress: z.any().optional(),
    })
    .optional(),
  expectedBehavior: z.string(),
});

type CoachingQualityInput = z.infer<typeof coachingQualityValidationSchema>;

class CoachingQualityMetric extends BaseMetric<
  typeof coachingQualityValidationSchema
> {
  public readonly validationSchema = coachingQualityValidationSchema;

  constructor(name = "coaching_quality", trackMetric = true) {
    super(name, trackMetric);
  }

  async score(input: CoachingQualityInput): Promise<EvaluationScoreResult[]> {
    const { input: testInput, output, expectedBehavior } = input;

    try {
      // Use your existing judgeCoachingQuality function
      const scores = await judgeCoachingQuality(
        testInput as CommitmentCoachInput,
        output as CommitmentCoachOutput,
        expectedBehavior,
      );

      return [
        {
          name: "tone_appropriateness",
          value: scores.toneAppropriateness,
          reason: scores.reasoning,
        },
        {
          name: "actionability",
          value: scores.actionability,
          reason: "Actionability assessment",
        },
        {
          name: "risk_accuracy",
          value: scores.riskAccuracy,
          reason: "Risk accuracy assessment",
        },
        {
          name: "urgency_calibration",
          value: scores.urgencyCalibration,
          reason: "Urgency calibration assessment",
        },
        {
          name: "overall_score",
          value: scores.overallScore,
          reason: `Overall coaching quality: ${scores.reasoning}`,
        },
      ];
    } catch (error) {
      console.error("Error in CoachingQualityMetric:", error);

      // Return default scores on error
      return [
        {
          name: "tone_appropriateness",
          value: 0,
          reason: `Error evaluating tone: ${error}`,
        },
        {
          name: "actionability",
          value: 0,
          reason: `Error evaluating actionability: ${error}`,
        },
        {
          name: "risk_accuracy",
          value: 0,
          reason: `Error evaluating risk accuracy: ${error}`,
        },
        {
          name: "urgency_calibration",
          value: 0,
          reason: `Error evaluating urgency: ${error}`,
        },
        {
          name: "overall_score",
          value: 0,
          reason: `Error in overall evaluation: ${error}`,
        },
      ];
    }
  }
}

// Define the dataset item type
type CommitmentCoachDatasetItem = {
  name: string;
  input: {
    commitment: any;
    user: any;
  };
  expectedBehavior: string;
};

async function evaluateCommitmentCoach(): Promise<AgentEvaluationSummary> {
  console.log("\n" + "=".repeat(60));
  console.log("🏋️ EVALUATING COMMITMENT COACH");
  console.log("=".repeat(60));

  const experimentName = `${EXPERIMENT_PREFIX}-commitment-coach-${timestamp}`;
  const opikClient = new Opik();

  // Create or get dataset
  const dataset =
    await opikClient.getOrCreateDataset<CommitmentCoachDatasetItem>(
      "commitment-coach-test-cases",
    );

  // Insert test cases into dataset (Opik automatically deduplicates)
  const datasetItems = commitmentCoachTestCases.map((testCase, index) => ({
    name: testCase.name,
    input: testCase.input,
    expectedBehavior: testCase.expectedBehavior,
    metadata: {
      testIndex: index,
      category: "commitment-coach",
    },
  }));

  await dataset.insert(datasetItems);

  // Define the evaluation task
  const evaluationTask: EvaluationTask<CommitmentCoachDatasetItem> = async (
    datasetItem,
  ) => {
    console.log(`\nEvaluating: ${datasetItem.name}`);

    const startTime = Date.now();

    try {
      // Run your commitment coach flow
      const output = await commitmentCoachFlow(datasetItem.input);
      const durationMs = Date.now() - startTime;

      return {
        output: {
          nextAction: output.nextAction,
          nudge: output.nudge,
          riskAssessment: output.riskAssessment,
          warning: output.warning,
          progress: output.progress,
        },
        metadata: {
          durationMs,
          testName: datasetItem.name,
        },
      };
    } catch (error) {
      console.error(`   ❌ Error: ${error}`);
      return {
        output: null,
        error: error?.toString(),
        metadata: {
          durationMs: Date.now() - startTime,
          testName: datasetItem.name,
        },
      };
    }
  };

  // Run the evaluation using Opik's evaluate function
  const evaluationResult = await evaluate({
    dataset: dataset,
    task: evaluationTask,
    scoringMetrics: [new CoachingQualityMetric()],
    experimentName: experimentName,
    projectName: "nilla",
    experimentConfig: {
      timestamp: timestamp,
      agentType: "commitment-coach",
      description: "Evaluating commitment coach agent performance",
    },
    scoringKeyMapping: {
      // Map dataset fields to metric parameters
      expectedBehavior: "expectedBehavior",
      input: "input",
    },
  });

  console.log(`\n✅ Experiment created: ${evaluationResult.experimentName}`);
  console.log(`📊 Experiment ID: ${evaluationResult.experimentId}`);
  console.log(`🔗 View results: ${evaluationResult.resultUrl}`);

  // Process results for your existing summary format
  const results: EvaluationResult<CommitmentCoachJudgeResult>[] = [];
  let totalDurationMs = 0;

  for (const testResult of evaluationResult.testResults) {
    const scoreResults = testResult.scoreResults;
    const metadata = testResult.testCase.taskOutput?.metadata as
      | { durationMs?: number; testName?: string }
      | undefined;

    // Extract scores from the evaluation results
    const scores = {
      toneAppropriateness:
        scoreResults.find((s) => s.name === "tone_appropriateness")?.value || 0,
      actionability:
        scoreResults.find((s) => s.name === "actionability")?.value || 0,
      riskAccuracy:
        scoreResults.find((s) => s.name === "risk_accuracy")?.value || 0,
      urgencyCalibration:
        scoreResults.find((s) => s.name === "urgency_calibration")?.value || 0,
      overallScore:
        scoreResults.find((s) => s.name === "overall_score")?.value || 0,
      reasoning:
        scoreResults.find((s) => s.name === "tone_appropriateness")?.reason ||
        "",
    };

    const durationMs = metadata?.durationMs || 0;
    totalDurationMs += durationMs;

    results.push({
      testName: metadata?.testName || "Unknown",
      scores: scores as CommitmentCoachJudgeResult,
      output: testResult.testCase.taskOutput?.output,
      durationMs,
    });
  }

  // Calculate averages
  const averageScores = calculateAverageScores(
    results.map((r) => r.scores as unknown as Record<string, string | number>),
  );

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

// Run the evaluation
evaluateCommitmentCoach().catch((error) => {
  console.error("Error during commitment coach evaluation:", error);
  process.exit(1);
});
