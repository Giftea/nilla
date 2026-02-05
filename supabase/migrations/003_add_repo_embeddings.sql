-- RAG Embeddings Table for Repository Documents
-- Stores chunked document content with vector embeddings for similarity search

-- Enable pgvector extension for embedding storage and similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- REPO DOCUMENT EMBEDDINGS
-- ============================================
CREATE TABLE public.repo_document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Link to the tracked repository
    repo_id UUID NOT NULL REFERENCES public.tracked_repos(id) ON DELETE CASCADE,

    -- Repository identifier for quick lookups without joins
    github_repo_full_name TEXT NOT NULL,

    -- Source file path within the repo (e.g., "README.md", "docs/setup.md")
    file_path TEXT NOT NULL,

    -- The actual text content of this chunk
    content TEXT NOT NULL,

    -- Chunk ordering: position of this chunk within the source file
    chunk_index INTEGER NOT NULL,

    -- OpenAI text-embedding-3-small produces 1536-dimensional vectors
    embedding vector(1536) NOT NULL,

    -- Token count for this chunk (useful for debugging and monitoring)
    token_count INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Fast lookup: find all chunks for a specific repo
CREATE INDEX idx_repo_doc_chunks_repo_id ON public.repo_document_chunks(repo_id);

-- Fast lookup: find chunks by repo name (avoids join with tracked_repos)
CREATE INDEX idx_repo_doc_chunks_repo_name ON public.repo_document_chunks(github_repo_full_name);

-- Unique constraint: prevent duplicate chunks for the same file and position
CREATE UNIQUE INDEX idx_repo_doc_chunks_unique
    ON public.repo_document_chunks(repo_id, file_path, chunk_index);

-- HNSW index for fast approximate nearest-neighbor search on embeddings
-- cosine distance is standard for OpenAI embeddings
CREATE INDEX idx_repo_doc_chunks_embedding
    ON public.repo_document_chunks
    USING hnsw (embedding vector_cosine_ops);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.repo_document_chunks ENABLE ROW LEVEL SECURITY;

-- Embeddings are a shared cache — any authenticated user can read them
CREATE POLICY "Authenticated users can read document chunks"
    ON public.repo_document_chunks
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only service role (admin client) should insert/update/delete embeddings,
-- so no INSERT/UPDATE/DELETE policies for regular users.
-- The ingestion pipeline uses the admin client which bypasses RLS.

-- ============================================
-- HELPER FUNCTION: Similarity Search
-- ============================================

-- Search for the most relevant document chunks for a given query embedding
CREATE OR REPLACE FUNCTION match_repo_documents(
    query_embedding vector(1536),
    match_repo_id UUID,
    match_count INTEGER DEFAULT 5,
    match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id UUID,
    file_path TEXT,
    content TEXT,
    chunk_index INTEGER,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        rdc.id,
        rdc.file_path,
        rdc.content,
        rdc.chunk_index,
        1 - (rdc.embedding <=> query_embedding) AS similarity
    FROM public.repo_document_chunks rdc
    WHERE rdc.repo_id = match_repo_id
      AND 1 - (rdc.embedding <=> query_embedding) > match_threshold
    ORDER BY rdc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
