import OpenAI from "openai";
import { createAdminClient } from "@/lib/supabase/admin";

export interface RepoDocument {
  filePath: string;
  content: string;
}

interface DocumentChunk {
  filePath: string;
  content: string;
  chunkIndex: number;
  tokenCount: number;
}

interface ChunkRow {
  repo_id: string;
  github_repo_full_name: string;
  file_path: string;
  content: string;
  chunk_index: number;
  embedding: string;
  token_count: number;
}

const EMBEDDING_MODEL = "text-embedding-3-small";
const TARGET_CHUNK_TOKENS = 400;
const CHUNK_OVERLAP_TOKENS = 50;
const CHARS_PER_TOKEN = 4;
const TARGET_CHUNK_CHARS = TARGET_CHUNK_TOKENS * CHARS_PER_TOKEN;
const OVERLAP_CHARS = CHUNK_OVERLAP_TOKENS * CHARS_PER_TOKEN;
const EMBEDDING_BATCH_SIZE = 100;

function chunkDocument(doc: RepoDocument): DocumentChunk[] {
  const { filePath, content } = doc;
  if (!content.trim()) return [];
  const paragraphs = content.split(/\n{2,}/).filter((p) => p.trim());
  const chunks: DocumentChunk[] = [];
  let currentChunk = "";
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const candidate = currentChunk
      ? currentChunk + "\n\n" + paragraph
      : paragraph;

    if (candidate.length > TARGET_CHUNK_CHARS && currentChunk) {
      chunks.push({
        filePath,
        content: currentChunk.trim(),
        chunkIndex: chunkIndex++,
        tokenCount: Math.ceil(currentChunk.trim().length / CHARS_PER_TOKEN),
      });

      const overlapText = currentChunk.slice(-OVERLAP_CHARS);
      currentChunk = overlapText + "\n\n" + paragraph;
    } else {
      currentChunk = candidate;
    }
  }

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

async function generateEmbeddings(
  openai: OpenAI,
  texts: string[],
): Promise<number[][]> {
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE);

    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });

    const sorted = response.data.sort((a, b) => a.index - b.index);
    for (const item of sorted) {
      allEmbeddings.push(item.embedding);
    }
  }

  return allEmbeddings;
}

async function storeChunks(rows: ChunkRow[]): Promise<void> {
  const supabase = createAdminClient();
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

export async function ingestRepoDocuments(
  repoId: string,
  repoFullName: string,
  documents: RepoDocument[],
): Promise<{ chunksStored: number }> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const allChunks: DocumentChunk[] = [];
  for (const doc of documents) {
    const chunks = chunkDocument(doc);
    allChunks.push(...chunks);
  }

  if (allChunks.length === 0) {
    return { chunksStored: 0 };
  }

  const texts = allChunks.map((c) => c.content);
  const embeddings = await generateEmbeddings(openai, texts);

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

export async function clearRepoChunks(repoId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("repo_document_chunks")
    .delete()
    .eq("repo_id", repoId);

  if (error) {
    throw new Error(
      `Failed to clear chunks for repo ${repoId}: ${error.message}`,
    );
  }
}
