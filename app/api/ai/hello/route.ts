import { NextRequest, NextResponse } from "next/server";
import { helloAgentFlow, HelloAgentInputSchema } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input using Zod schema
    const parseResult = HelloAgentInputSchema.safeParse(body);

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
    const result = await helloAgentFlow(parseResult.data);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Hello agent error:", error);
    return NextResponse.json(
      {
        error: "Failed to process request",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
