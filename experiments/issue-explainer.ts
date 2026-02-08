import {
  issueExplainerTestCases,
} from "../lib/opik/evaluations/datasets";
import { issueExplainerFlow } from "../lib/ai/agents/issue-explainer";
import {
  judgeExplanationQuality,
  calculateAverageScores,
  type IssueExplainerJudgeResult,
} from "../lib/opik/evaluations/judges";
import { evaluate, EvaluationTask, Opik, BaseMetric, EvaluationScoreResult } from "opik";

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
const explanationQualityValidationSchema = z.object({
  input: z.object({
    issue: z.object({
      title: z.string(),
      body: z.string().optional(),
      labels: z.array(z.string()),
      repository: z.string(),
      url: z.string(),
    }),
    user: z.object({
      experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
    }),
    repoContext: z.string().optional(),
  }),
  output: z.object({
    summary: z.any().optional(),
    expectedOutcome: z.any().optional(),
    repoGuidelines: z.any().optional(),
    beginnerPitfalls: z.any().optional(),
    suggestedApproach: z.any().optional(),
    keyTerms: z.any().optional(),
    confidenceNote: z.any().optional(),
  }).optional(),
  expectedBehavior: z.string(),
});

type ExplanationQualityInput = z.infer<typeof explanationQualityValidationSchema>;

class ExplanationQualityMetric extends BaseMetric<typeof explanationQualityValidationSchema> {
  public readonly validationSchema = explanationQualityValidationSchema;

  constructor(name = "explanation_quality", trackMetric = true) {
    super(name, trackMetric);
  }

  async score(input: ExplanationQualityInput): Promise<EvaluationScoreResult[]> {
    const { input: testInput, output, expectedBehavior } = input;

    if (!output) {
      return [
        { name: "clarity", value: 0, reason: "No output to evaluate" },
        { name: "accuracy", value: 0, reason: "No output to evaluate" },
        { name: "level_appropriateness", value: 0, reason: "No output to evaluate" },
        { name: "actionability", value: 0, reason: "No output to evaluate" },
        { name: "overall_score", value: 0, reason: "No output to evaluate" },
      ];
    }

    try {
      // Use the judgeExplanationQuality function
      const scores = await judgeExplanationQuality(
        testInput,
        output as any,
        expectedBehavior
      );

      return [
        {
          name: "clarity",
          value: scores.clarity,
          reason: scores.reasoning,
        },
        {
          name: "accuracy",
          value: scores.accuracy,
          reason: "Accuracy assessment",
        },
        {
          name: "level_appropriateness",
          value: scores.levelAppropriateness,
          reason: "Level appropriateness assessment",
        },
        {
          name: "actionability",
          value: scores.actionability,
          reason: "Actionability assessment",
        },
        {
          name: "overall_score",
          value: scores.overallScore,
          reason: `Overall explanation quality: ${scores.reasoning}`,
        },
      ];
    } catch (error) {
      console.error("Error in ExplanationQualityMetric:", error);

      // Return default scores on error
      return [
        {
          name: "clarity",
          value: 0,
          reason: `Error evaluating clarity: ${error}`,
        },
        {
          name: "accuracy",
          value: 0,
          reason: `Error evaluating accuracy: ${error}`,
        },
        {
          name: "level_appropriateness",
          value: 0,
          reason: `Error evaluating level appropriateness: ${error}`,
        },
        {
          name: "actionability",
          value: 0,
          reason: `Error evaluating actionability: ${error}`,
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
type IssueExplainerDatasetItem = {
  name: string;
  input: {
    issue: any;
    user: any;
    repoContext?: string;
  };
  expectedBehavior: string;
};

async function evaluateIssueExplainer(): Promise<AgentEvaluationSummary> {
  console.log("\n" + "=".repeat(60));
  console.log("📖 EVALUATING ISSUE EXPLAINER");
  console.log("=".repeat(60));

  const experimentName = `${EXPERIMENT_PREFIX}-issue-explainer-${timestamp}`;
  const opikClient = new Opik();

  // Create or get dataset
  const dataset = await opikClient.getOrCreateDataset<IssueExplainerDatasetItem>(
    "issue-explainer-test-cases"
  );

  // Insert test cases into dataset (Opik automatically deduplicates)
  const datasetItems = issueExplainerTestCases.map((testCase, index) => ({
    name: testCase.name,
    input: testCase.input,
    expectedBehavior: testCase.expectedBehavior,
    metadata: {
      testIndex: index,
      category: "issue-explainer",
    },
  }));

  await dataset.insert(datasetItems);

  // Define the evaluation task
  const evaluationTask: EvaluationTask<IssueExplainerDatasetItem> = async (datasetItem) => {
    console.log(`\nEvaluating: ${datasetItem.name}`);

    const startTime = Date.now();

    try {
      // Run the issue explainer flow
      const output = await issueExplainerFlow(datasetItem.input);
      const durationMs = Date.now() - startTime;

      return {
        output: {
          summary: output.summary,
          expectedOutcome: output.expectedOutcome,
          repoGuidelines: output.repoGuidelines,
          beginnerPitfalls: output.beginnerPitfalls,
          suggestedApproach: output.suggestedApproach,
          keyTerms: output.keyTerms,
          confidenceNote: output.confidenceNote,
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
    scoringMetrics: [new ExplanationQualityMetric()],
    experimentName: experimentName,
    projectName: "nilla",
    experimentConfig: {
      timestamp: timestamp,
      agentType: "issue-explainer",
      version: "1.0",
      description: "Evaluating issue explainer agent performance",
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
  const results: EvaluationResult<IssueExplainerJudgeResult>[] = [];
  let totalDurationMs = 0;

  for (const testResult of evaluationResult.testResults) {
    const scoreResults = testResult.scoreResults;
    const metadata = testResult.testCase.taskOutput?.metadata as { durationMs?: number; testName?: string } | undefined;

    // Extract scores from the evaluation results
    const scores = {
      clarity: scoreResults.find(s => s.name === "clarity")?.value || 0,
      accuracy: scoreResults.find(s => s.name === "accuracy")?.value || 0,
      levelAppropriateness: scoreResults.find(s => s.name === "level_appropriateness")?.value || 0,
      actionability: scoreResults.find(s => s.name === "actionability")?.value || 0,
      overallScore: scoreResults.find(s => s.name === "overall_score")?.value || 0,
      reasoning: scoreResults.find(s => s.name === "clarity")?.reason || "",
    };

    const durationMs = metadata?.durationMs || 0;
    totalDurationMs += durationMs;

    results.push({
      testName: metadata?.testName || "Unknown",
      scores: scores as IssueExplainerJudgeResult,
      output: testResult.testCase.taskOutput?.output,
      durationMs,
    });
  }

  // Calculate averages
  const averageScores = calculateAverageScores(
    results.map((r) => r.scores as unknown as Record<string, string | number>)
  );

  console.log("\n" + "-".repeat(40));
  console.log("📊 ISSUE EXPLAINER SUMMARY");
  console.log(`   Average Overall Score: ${averageScores.overallScore}/5`);
  console.log(`   Clarity: ${averageScores.clarity}/5`);
  console.log(`   Accuracy: ${averageScores.accuracy}/5`);
  console.log(`   Level Appropriateness: ${averageScores.levelAppropriateness}/5`);
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

// Run the evaluation
evaluateIssueExplainer().catch((error) => {
  console.error("Error during issue explainer evaluation:", error);
  process.exit(1);
});
