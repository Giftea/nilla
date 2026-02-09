import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";

export interface RetrievedChunk {
  id: string;
  filePath: string;
  content: string;
  chunkIndex: number;
  similarity: number;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  contextText: string;
  empty: boolean;
}

const EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_MATCH_COUNT = 5;
const DEFAULT_MATCH_THRESHOLD = 0.7;

function buildQueryText(issueTitle: string, issueBody?: string | null): string {
  const title = issueTitle.trim();
  const body = issueBody?.trim();

  if (body) {
    return `${title}\n\n${body}`.slice(0, 8000);
  }

  return title;
}

async function embedQuery(openai: OpenAI, text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });

  return response.data[0].embedding;
}

async function queryChunks(
  queryEmbedding: number[],
  repoId: string,
  matchCount: number,
  matchThreshold: number,
): Promise<RetrievedChunk[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("match_repo_documents", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_repo_id: repoId,
    match_count: matchCount,
    match_threshold: matchThreshold,
  });

  if (error) {
    throw new Error(`Similarity search failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map(
    (row: {
      id: string;
      file_path: string;
      content: string;
      chunk_index: number;
      similarity: number;
    }) => ({
      id: row.id,
      filePath: row.file_path,
      content: row.content,
      chunkIndex: row.chunk_index,
      similarity: row.similarity,
    }),
  );
}

function formatContextForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "";
  }

  const byFile = new Map<string, RetrievedChunk[]>();
  for (const chunk of chunks) {
    const existing = byFile.get(chunk.filePath) ?? [];
    existing.push(chunk);
    byFile.set(chunk.filePath, existing);
  }

  const sections: string[] = [];

  for (const [filePath, fileChunks] of byFile) {
    const sorted = fileChunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
    const content = sorted.map((c) => c.content).join("\n\n");
    sections.push(`### ${filePath}\n${content}`);
  }

  return `## Repository Documentation Context\nThe following excerpts from the repository documentation may be relevant:\n\n${sections.join("\n\n---\n\n")}`;
}

export async function retrieveRepoContext(
  repoId: string,
  issueTitle: string,
  issueBody?: string | null,
  options?: {
    matchCount?: number;
    matchThreshold?: number;
  },
): Promise<RetrievalResult> {
  const matchCount = options?.matchCount ?? DEFAULT_MATCH_COUNT;
  const matchThreshold = options?.matchThreshold ?? DEFAULT_MATCH_THRESHOLD;

  const queryText = buildQueryText(issueTitle, issueBody);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const queryEmbedding = await embedQuery(openai, queryText);

  const chunks = await queryChunks(
    queryEmbedding,
    repoId,
    matchCount,
    matchThreshold,
  );

  const contextText = formatContextForPrompt(chunks);

  return {
    chunks,
    contextText,
    empty: chunks.length === 0,
  };
}
