import { issueRecommenderTestCases } from "../evaluations/datasets";
import { recommendIssueFlow } from "../../ai/agents/recommend-issue";
import {
  judgeIssueRecommendation,
  calculateAverageScores,
  type IssueRecommenderJudgeResult,
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
const recommendationQualityValidationSchema = z.object({
  input: z.object({
    user: z.object({
      id: z.string(),
      username: z.string(),
      skillLevel: z.enum(["beginner", "intermediate", "advanced"]),
      preferredLanguages: z.array(z.string()),
      interests: z.array(z.string()).optional(),
      pastContributions: z.number().default(0),
      availableHoursPerWeek: z.number().optional(),
    }),
    issues: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        body: z.string().optional(),
        labels: z.array(z.string()),
        repository: z.string(),
        language: z.string().optional(),
        openedAt: z.string().optional(),
        commentCount: z.number().default(0),
        url: z.string(),
      }),
    ),
  }),
  output: z
    .object({
      recommendedIssue: z.any().optional(),
      explanation: z.any().optional(),
      riskLevel: z.any().optional(),
      riskFactors: z.any().optional(),
      alternativeIssues: z.any().optional(),
      rankedIssues: z.any().optional(),
    })
    .optional(),
  expectedBehavior: z.string(),
});

type RecommendationQualityInput = z.infer<
  typeof recommendationQualityValidationSchema
>;

class RecommendationQualityMetric extends BaseMetric<
  typeof recommendationQualityValidationSchema
> {
  public readonly validationSchema = recommendationQualityValidationSchema;

  constructor(name = "recommendation_quality", trackMetric = true) {
    super(name, trackMetric);
  }

  async score(
    input: RecommendationQualityInput,
  ): Promise<EvaluationScoreResult[]> {
    const { input: testInput, output, expectedBehavior } = input;

    if (!output) {
      return [
        { name: "match_quality", value: 0, reason: "No output to evaluate" },
        {
          name: "difficulty_calibration",
          value: 0,
          reason: "No output to evaluate",
        },
        {
          name: "explanation_clarity",
          value: 0,
          reason: "No output to evaluate",
        },
        { name: "risk_assessment", value: 0, reason: "No output to evaluate" },
        { name: "overall_score", value: 0, reason: "No output to evaluate" },
      ];
    }

    try {
      // Use the judgeIssueRecommendation function
      const scores = await judgeIssueRecommendation(
        testInput,
        output as any,
        expectedBehavior,
      );

      return [
        {
          name: "match_quality",
          value: scores.matchQuality,
          reason: scores.reasoning,
        },
        {
          name: "difficulty_calibration",
          value: scores.difficultyCalibration,
          reason: "Difficulty calibration assessment",
        },
        {
          name: "explanation_clarity",
          value: scores.explanationClarity,
          reason: "Explanation clarity assessment",
        },
        {
          name: "risk_assessment",
          value: scores.riskAssessment,
          reason: "Risk assessment evaluation",
        },
        {
          name: "overall_score",
          value: scores.overallScore,
          reason: `Overall recommendation quality: ${scores.reasoning}`,
        },
      ];
    } catch (error) {
      console.error("Error in RecommendationQualityMetric:", error);

      // Return default scores on error
      return [
        {
          name: "match_quality",
          value: 0,
          reason: `Error evaluating match quality: ${error}`,
        },
        {
          name: "difficulty_calibration",
          value: 0,
          reason: `Error evaluating difficulty calibration: ${error}`,
        },
        {
          name: "explanation_clarity",
          value: 0,
          reason: `Error evaluating explanation clarity: ${error}`,
        },
        {
          name: "risk_assessment",
          value: 0,
          reason: `Error evaluating risk assessment: ${error}`,
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
type IssueRecommenderDatasetItem = {
  name: string;
  input: {
    user: any;
    issues: any[];
  };
  expectedBehavior: string;
};

async function evaluateIssueRecommender(): Promise<AgentEvaluationSummary> {
  console.log("\n" + "=".repeat(60));
  console.log("🎯 EVALUATING ISSUE RECOMMENDER");
  console.log("=".repeat(60));

  const experimentName = `${EXPERIMENT_PREFIX}-issue-recommender-${timestamp}`;
  const opikClient = new Opik();

  // Create or get dataset
  const dataset =
    await opikClient.getOrCreateDataset<IssueRecommenderDatasetItem>(
      "issue-recommender-test-cases",
    );

  // Insert test cases into dataset (Opik automatically deduplicates)
  const datasetItems = issueRecommenderTestCases.map((testCase, index) => ({
    name: testCase.name,
    input: testCase.input,
    expectedBehavior: testCase.expectedBehavior,
    metadata: {
      testIndex: index,
      category: "issue-recommender",
    },
  }));

  await dataset.insert(datasetItems);

  // Define the evaluation task
  const evaluationTask: EvaluationTask<IssueRecommenderDatasetItem> = async (
    datasetItem,
  ) => {
    console.log(`\nEvaluating: ${datasetItem.name}`);

    const startTime = Date.now();

    try {
      // Run the issue recommender flow
      const output = await recommendIssueFlow(datasetItem.input);
      const durationMs = Date.now() - startTime;

      return {
        output: {
          recommendedIssue: output.recommendedIssue,
          explanation: output.explanation,
          riskLevel: output.riskLevel,
          riskFactors: output.riskFactors,
          alternativeIssues: output.alternativeIssues,
          rankedIssues: output.rankedIssues,
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
    scoringMetrics: [new RecommendationQualityMetric()],
    experimentName: experimentName,
    projectName: "nilla",
    experimentConfig: {
      timestamp: timestamp,
      agentType: "issue-recommender",
      version: "1.0",
      description: "Evaluating issue recommender agent performance",
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
  const results: EvaluationResult<IssueRecommenderJudgeResult>[] = [];
  let totalDurationMs = 0;

  for (const testResult of evaluationResult.testResults) {
    const scoreResults = testResult.scoreResults;
    const metadata = testResult.testCase.taskOutput?.metadata as
      | { durationMs?: number; testName?: string }
      | undefined;

    // Extract scores from the evaluation results
    const scores = {
      matchQuality:
        scoreResults.find((s) => s.name === "match_quality")?.value || 0,
      difficultyCalibration:
        scoreResults.find((s) => s.name === "difficulty_calibration")?.value ||
        0,
      explanationClarity:
        scoreResults.find((s) => s.name === "explanation_clarity")?.value || 0,
      riskAssessment:
        scoreResults.find((s) => s.name === "risk_assessment")?.value || 0,
      overallScore:
        scoreResults.find((s) => s.name === "overall_score")?.value || 0,
      reasoning:
        scoreResults.find((s) => s.name === "match_quality")?.reason || "",
    };

    const durationMs = metadata?.durationMs || 0;
    totalDurationMs += durationMs;

    results.push({
      testName: metadata?.testName || "Unknown",
      scores: scores as IssueRecommenderJudgeResult,
      output: testResult.testCase.taskOutput?.output,
      durationMs,
    });
  }

  // Calculate averages
  const averageScores = calculateAverageScores(
    results.map((r) => r.scores as unknown as Record<string, string | number>),
  );

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

// Run the evaluation
evaluateIssueRecommender().catch((error) => {
  console.error("Error during issue recommender evaluation:", error);
  process.exit(1);
});
