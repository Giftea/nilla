import { NextRequest, NextResponse } from "next/server";
import { commitmentCoachFlow, CommitmentCoachInputSchema } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input using Zod schema
    const parseResult = CommitmentCoachInputSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    // Run the coaching agent flow
    const result = await commitmentCoachFlow(parseResult.data);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Commitment coach agent error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate coaching",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
