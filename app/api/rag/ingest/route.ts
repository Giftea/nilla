import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ingestRepoDocuments, clearRepoChunks } from "@/lib/rag/ingest";

// Validate the request body: repo info + array of documents
const IngestRequestSchema = z.object({
  repoId: z.string().uuid(),
  repoFullName: z.string().min(1),
  documents: z
    .array(
      z.object({
        filePath: z.string().min(1),
        content: z.string().min(1),
      })
    )
    .min(1),
  /** If true, delete existing chunks before re-ingesting */
  clean: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    // Verify this is called with a service-level secret to prevent abuse.
    // In production, replace with proper auth (e.g. check session or API key).
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const parseResult = IngestRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { repoId, repoFullName, documents, clean } = parseResult.data;

    // Optionally clear existing chunks for a fresh re-ingest
    if (clean) {
      await clearRepoChunks(repoId);
    }

    const result = await ingestRepoDocuments(repoId, repoFullName, documents);

    return NextResponse.json({
      success: true,
      repoFullName,
      ...result,
    });
  } catch (error) {
    console.error("RAG ingestion error:", error);
    return NextResponse.json(
      {
        error: "Failed to ingest documents",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
