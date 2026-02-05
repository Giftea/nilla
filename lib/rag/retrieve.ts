import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";

// ============================================
// TYPES
// ============================================

/** A single matched chunk returned from similarity search. */
export interface RetrievedChunk {
  /** UUID of the chunk row */
  id: string;
  /** Source file within the repo (e.g. "README.md") */
  filePath: string;
  /** The text content of the chunk */
  content: string;
  /** Position of this chunk within its source file */
  chunkIndex: number;
  /** Cosine similarity score (0–1, higher = more relevant) */
  similarity: number;
}

/** The full result of a retrieval query. */
export interface RetrievalResult {
  /** The matched chunks, ordered by relevance (most relevant first) */
  chunks: RetrievedChunk[];
  /** Pre-formatted string ready to inject into an AI prompt */
  contextText: string;
  /** True if no relevant chunks were found */
  empty: boolean;
}

// ============================================
// CONFIGURATION
// ============================================

/** Must match the model used during ingestion (see lib/rag/ingest.ts) */
const EMBEDDING_MODEL = "text-embedding-3-small";

/** Default number of chunks to return */
const DEFAULT_MATCH_COUNT = 5;

/**
 * Minimum cosine similarity to consider a chunk relevant.
 * 0.7 is a reasonable default for OpenAI embeddings — chunks below
 * this threshold are usually off-topic noise.
 */
const DEFAULT_MATCH_THRESHOLD = 0.7;

// ============================================
// STEP 1: BUILD QUERY TEXT
// ============================================

/**
 * Combines the issue title and body into a single query string
 * suitable for embedding. Handles missing or empty body gracefully.
 */
function buildQueryText(issueTitle: string, issueBody?: string | null): string {
  const title = issueTitle.trim();
  const body = issueBody?.trim();

  // If there's a body, prepend the title for context.
  // Truncate to ~8000 chars to stay within embedding model limits.
  if (body) {
    return `${title}\n\n${body}`.slice(0, 8000);
  }

  return title;
}

// ============================================
// STEP 2: GENERATE QUERY EMBEDDING
// ============================================

/**
 * Generates a single embedding vector for the query text.
 * Uses the same model as ingestion to ensure vector compatibility.
 */
async function embedQuery(
  openai: OpenAI,
  text: string
): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });

  return response.data[0].embedding;
}

// ============================================
// STEP 3: QUERY SUPABASE VIA RPC
// ============================================

/**
 * Calls the match_repo_documents database function to find the most
 * relevant chunks for a given query embedding, filtered by repository.
 */
async function queryChunks(
  queryEmbedding: number[],
  repoId: string,
  matchCount: number,
  matchThreshold: number
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

  return data.map((row: { id: string; file_path: string; content: string; chunk_index: number; similarity: number }) => ({
    id: row.id,
    filePath: row.file_path,
    content: row.content,
    chunkIndex: row.chunk_index,
    similarity: row.similarity,
  }));
}

// ============================================
// STEP 4: FORMAT FOR AI PROMPT
// ============================================

/**
 * Formats retrieved chunks into a markdown string that can be
 * injected directly into an AI agent's system or user prompt.
 *
 * Groups chunks by source file for readability.
 */
function formatContextForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "";
  }

  // Group chunks by source file
  const byFile = new Map<string, RetrievedChunk[]>();
  for (const chunk of chunks) {
    const existing = byFile.get(chunk.filePath) ?? [];
    existing.push(chunk);
    byFile.set(chunk.filePath, existing);
  }

  const sections: string[] = [];

  for (const [filePath, fileChunks] of byFile) {
    // Sort chunks within each file by their original position
    const sorted = fileChunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

    const content = sorted.map((c) => c.content).join("\n\n");

    sections.push(
      `### ${filePath}\n${content}`
    );
  }

  return `## Repository Documentation Context\nThe following excerpts from the repository documentation may be relevant:\n\n${sections.join("\n\n---\n\n")}`;
}

// ============================================
// MAIN RETRIEVAL FUNCTION
// ============================================

/**
 * Retrieves the most relevant repository documentation for a GitHub issue.
 *
 * This is a pure retrieval function — it does not contain any agent logic.
 * Pass the result's `contextText` into an AI prompt to give the agent
 * repository-specific knowledge.
 *
 * @param repoId     - UUID of the tracked_repos row to search within
 * @param issueTitle - Title of the GitHub issue
 * @param issueBody  - Body/description of the issue (optional)
 * @param options    - Optional overrides for match count and threshold
 *
 * @returns RetrievalResult with chunks, formatted context, and empty flag
 *
 * @example
 * ```ts
 * const { contextText, empty } = await retrieveRepoContext(
 *   repoId,
 *   "Fix broken link in installation guide",
 *   "The README references a page that no longer exists..."
 * );
 *
 * if (!empty) {
 *   // Inject contextText into your AI agent's prompt
 *   const prompt = `${systemPrompt}\n\n${contextText}\n\n${userMessage}`;
 * }
 * ```
 */
export async function retrieveRepoContext(
  repoId: string,
  issueTitle: string,
  issueBody?: string | null,
  options?: {
    matchCount?: number;
    matchThreshold?: number;
  }
): Promise<RetrievalResult> {
  const matchCount = options?.matchCount ?? DEFAULT_MATCH_COUNT;
  const matchThreshold = options?.matchThreshold ?? DEFAULT_MATCH_THRESHOLD;

  // Step 1: Build the query from issue title + body
  const queryText = buildQueryText(issueTitle, issueBody);

  // Step 2: Generate embedding for the query
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const queryEmbedding = await embedQuery(openai, queryText);

  // Step 3: Find similar chunks in Supabase
  const chunks = await queryChunks(
    queryEmbedding,
    repoId,
    matchCount,
    matchThreshold
  );

  // Step 4: Format into a prompt-ready string
  const contextText = formatContextForPrompt(chunks);

  return {
    chunks,
    contextText,
    empty: chunks.length === 0,
  };
}
