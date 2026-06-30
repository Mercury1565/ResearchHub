-- migrations/006_fix_embeddings.up.sql
-- Sets up pgvector with gemini-embedding-2 (3072-dim).
-- No-ops gracefully if pgvector is not installed (same as 003).

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pgvector not available — skipping embedding column update (RAG disabled)';
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    ALTER TABLE doc_chunks DROP COLUMN IF EXISTS embedding;
    ALTER TABLE doc_chunks ADD COLUMN embedding vector(3072);
  END IF;
END $$;
