-- migrations/003_vector.up.sql
-- Adds pgvector support for AI/RAG chat. Requires the pgvector OS package:
--   Debian/Ubuntu: apt-get install postgresql-18-pgvector
--   Docker:        use image pgvector/pgvector:pg18 instead of postgres:18
-- Migration succeeds without it — RAG features are simply unavailable.

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pgvector not available — skipping vector column setup (RAG disabled)';
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    ALTER TABLE doc_chunks ADD COLUMN IF NOT EXISTS embedding vector(768);
    CREATE INDEX IF NOT EXISTS doc_chunks_embedding_idx
      ON doc_chunks USING hnsw (embedding vector_cosine_ops);
  END IF;
END $$;
