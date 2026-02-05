import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";

// ============================================
// TYPES
// ============================================

/** A document fetched from a repo, ready to be chunked and embedded. */
export interface RepoDocument {
  /** Relative path within the repo, e.g. "README.md" or "docs/setup.md" */
  filePath: string;
  /** The raw text content of the file */
  content: string;
}

/** A single chunk produced from splitting a document. */
interface DocumentChunk {
  filePath: string;
  content: string;
  chunkIndex: number;
  tokenCount: number;
}

/** Row to be inserted into repo_document_chunks. */
interface ChunkRow {
  repo_id: string;
  github_repo_full_name: string;
  file_path: string;
  content: string;
  chunk_index: number;
  embedding: string; // pgvector accepts JSON array as string
  token_count: number;
}

// ============================================
// CONFIGURATION
// ============================================

/** OpenAI embedding model — small, fast, 1536 dimensions */
const EMBEDDING_MODEL = "text-embedding-3-small";

/**
 * Target chunk size in tokens. OpenAI's tokenizer averages ~4 chars per token
 * for English, so we use a character-based approximation (300–500 tokens ≈
 * 1200–2000 chars). We split on paragraph boundaries to keep chunks coherent.
 */
const TARGET_CHUNK_TOKENS = 400;
const CHUNK_OVERLAP_TOKENS = 50;

// Approximate chars-per-token for English text
const CHARS_PER_TOKEN = 4;
const TARGET_CHUNK_CHARS = TARGET_CHUNK_TOKENS * CHARS_PER_TOKEN;
const OVERLAP_CHARS = CHUNK_OVERLAP_TOKENS * CHARS_PER_TOKEN;

/** OpenAI embeddings API allows up to 2048 inputs per request.
 *  We batch in groups of 100 to stay well within limits. */
const EMBEDDING_BATCH_SIZE = 100;

// ============================================
// STEP 1: CHUNKING
// ============================================

/**
 * Splits a document into overlapping chunks of ~300–500 tokens.
 *
 * Strategy: split on double-newlines (paragraph boundaries) first, then
 * merge small paragraphs into chunks up to TARGET_CHUNK_CHARS.
 * Each chunk overlaps with the previous one by OVERLAP_CHARS to preserve
 * context at boundaries.
 */
function chunkDocument(doc: RepoDocument): DocumentChunk[] {
  const { filePath, content } = doc;

  // Nothing to chunk for empty documents
  if (!content.trim()) return [];

  // Split into paragraphs (double newline boundaries)
  const paragraphs = content.split(/\n{2,}/).filter((p) => p.trim());

  const chunks: DocumentChunk[] = [];
  let currentChunk = "";
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const candidate = currentChunk
      ? currentChunk + "\n\n" + paragraph
      : paragraph;

    if (candidate.length > TARGET_CHUNK_CHARS && currentChunk) {
      // Current chunk is full — save it and start a new one with overlap
      chunks.push({
        filePath,
        content: currentChunk.trim(),
        chunkIndex: chunkIndex++,
        tokenCount: Math.ceil(currentChunk.trim().length / CHARS_PER_TOKEN),
      });

      // Start next chunk with overlap from the end of the previous chunk
      const overlapText = currentChunk.slice(-OVERLAP_CHARS);
      currentChunk = overlapText + "\n\n" + paragraph;
    } else {
      currentChunk = candidate;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push({
      filePath,
      content: currentChunk.trim(),
      chunkIndex: chunkIndex,
      tokenCount: Math.ceil(currentChunk.trim().length / CHARS_PER_TOKEN),
    });
  }

  return chunks;
}

// ============================================
// STEP 2: EMBEDDING
// ============================================

/**
 * Generates embeddings for an array of text chunks using OpenAI.
 *
 * Batches requests to stay within API limits. Returns an array of
 * 1536-dimensional vectors in the same order as the input.
 */
async function generateEmbeddings(
  openai: OpenAI,
  texts: string[]
): Promise<number[][]> {
  const allEmbeddings: number[][] = [];

  // Process in batches to respect API rate limits
  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });

    // OpenAI returns embeddings sorted by index, but we sort explicitly to be safe
    const sorted = response.data.sort((a, b) => a.index - b.index);
    for (const item of sorted) {
      allEmbeddings.push(item.embedding);
    }
  }

  return allEmbeddings;
}

// ============================================
// STEP 3: STORE IN SUPABASE
// ============================================

/**
 * Upserts chunk rows into the repo_document_chunks table.
 *
 * Uses the unique constraint (repo_id, file_path, chunk_index) to handle
 * re-ingestion gracefully — existing chunks are replaced.
 */
async function storeChunks(rows: ChunkRow[]): Promise<void> {
  const supabase = createAdminClient();

  // Upsert in batches of 50 to avoid request size limits
  const BATCH_SIZE = 50;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from("repo_document_chunks")
      .upsert(batch, {
        onConflict: "repo_id,file_path,chunk_index",
      });

    if (error) {
      throw new Error(`Failed to store chunks (batch ${i}): ${error.message}`);
    }
  }
}

// ============================================
// MAIN PIPELINE: ORCHESTRATE ALL STEPS
// ============================================

/**
 * Ingests repository documents into Supabase for RAG.
 *
 * This is the main entry point. Call it once per repository or on demand
 * when a repo is added. It:
 *   1. Chunks each document into ~400-token segments with overlap
 *   2. Generates embeddings for all chunks via OpenAI
 *   3. Stores chunks + embeddings + metadata in Supabase
 *
 * @param repoId       - UUID of the tracked_repos row
 * @param repoFullName - e.g. "facebook/react"
 * @param documents    - Array of { filePath, content } for files like
 *                        README.md, CONTRIBUTING.md, docs/*.md
 *
 * @returns The number of chunks stored
 */
export async function ingestRepoDocuments(
  repoId: string,
  repoFullName: string,
  documents: RepoDocument[]
): Promise<{ chunksStored: number }> {
  // Initialize OpenAI client (separate from the traced AI client since
  // embeddings don't need chat tracing)
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Step 1: Chunk all documents
  const allChunks: DocumentChunk[] = [];
  for (const doc of documents) {
    const chunks = chunkDocument(doc);
    allChunks.push(...chunks);
  }

  if (allChunks.length === 0) {
    return { chunksStored: 0 };
  }

  // Step 2: Generate embeddings for all chunk texts
  const texts = allChunks.map((c) => c.content);
  const embeddings = await generateEmbeddings(openai, texts);

  // Step 3: Build rows and store in Supabase
  const rows: ChunkRow[] = allChunks.map((chunk, i) => ({
    repo_id: repoId,
    github_repo_full_name: repoFullName,
    file_path: chunk.filePath,
    content: chunk.content,
    chunk_index: chunk.chunkIndex,
    embedding: JSON.stringify(embeddings[i]),
    token_count: chunk.tokenCount,
  }));

  await storeChunks(rows);

  return { chunksStored: rows.length };
}

/**
 * Deletes all existing chunks for a repo before re-ingesting.
 * Call this if you want a clean re-ingest rather than an upsert.
 */
export async function clearRepoChunks(repoId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("repo_document_chunks")
    .delete()
    .eq("repo_id", repoId);

  if (error) {
    throw new Error(`Failed to clear chunks for repo ${repoId}: ${error.message}`);
  }
}
