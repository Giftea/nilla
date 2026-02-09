import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { issueExplainerFlow } from "@/lib/ai/agents/issue-explainer";
import { retrieveRepoContext } from "@/lib/rag/retrieve";

const ExplainIssueRequestSchema = z.object({
  issue: z.object({
    title: z.string().min(1),
    body: z.string().optional(),
    labels: z.array(z.string()),
    repository: z.string().min(1),
    url: z.string().min(1),
  }),
  user: z.object({
    experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
  }),
  repoId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parseResult = ExplainIssueRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { issue, user, repoId } = parseResult.data;

    let repoContext: string | undefined;
    if (repoId) {
      console.log(`[Explain] Retrieving RAG context for repo ${repoId}`);
      const retrieval = await retrieveRepoContext(
        repoId,
        issue.title,
        issue.body
      );
      console.log(
        `[Explain] RAG result: ${retrieval.chunks.length} chunks, empty=${retrieval.empty}`
      );
      if (!retrieval.empty) {
        repoContext = retrieval.contextText;
      }
    } else {
      console.log("[Explain] No repoId provided, skipping RAG retrieval");
    }

    // Run the issue explainer agent
    const result = await issueExplainerFlow({
      issue,
      user,
      repoContext,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Issue explainer agent error:", error);
    return NextResponse.json(
      {
        error: "Failed to explain issue",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
