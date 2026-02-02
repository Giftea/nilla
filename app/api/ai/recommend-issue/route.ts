import { NextRequest, NextResponse } from "next/server";
import { recommendIssueFlow, RecommendIssueInputSchema } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input using Zod schema
    const parseResult = RecommendIssueInputSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    // Run the agent flow
    const result = await recommendIssueFlow(parseResult.data);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Recommend issue agent error:", error);
    return NextResponse.json(
      {
        error: "Failed to process recommendation",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
