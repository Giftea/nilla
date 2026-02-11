import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { opik, flushTraces } from "@/lib/ai/openai";

// Schema for feedback submission
const FeedbackSchema = z.object({
  traceId: z.string().describe("The Opik trace ID to associate feedback with"),
  feedbackType: z.enum(["thumbs_up", "thumbs_down"]).describe("User feedback type"),
  agentType: z.enum(["issue-recommender", "commitment-coach", "issue-explainer"]).describe("The agent that generated the response"),
  metadata: z.object({
    userId: z.string().optional(),
    recommendedIssueId: z.string().optional(),
    recommendedIssueTitle: z.string().optional(),
  }).optional(),
});

export type FeedbackInput = z.infer<typeof FeedbackSchema>;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parseResult = FeedbackSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { traceId, feedbackType, agentType } = parseResult.data;

    // Convert feedback to numeric score for Opik
    // thumbs_up = 1, thumbs_down = 0
    const score = feedbackType === "thumbs_up" ? 1 : 0;

    opik.traceFeedbackScoresBatchQueue.create({
      id: traceId,
      name: "user_satisfaction",
      value: score,
      reason: `User gave ${feedbackType} feedback`,
      categoryName: agentType,
      source: "ui",
    });

    await flushTraces();

    return NextResponse.json({
      success: true,
      message: "Feedback recorded successfully",
      data: {
        traceId,
        feedbackType,
        score,
      },
    });
  } catch (error) {
    console.error("Feedback API error:", error);
    return NextResponse.json(
      {
        error: "Failed to record feedback",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
