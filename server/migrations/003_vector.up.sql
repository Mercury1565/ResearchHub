-- migrations/003_vector.up.sql
-- Adds pgvector support for AI/RAG chat. Requires:
--   sudo apt-get install postgresql-18-pgvector
-- The rest of the app works without this migration.

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE doc_chunks ADD COLUMN embedding vector(768);

CREATE INDEX ON doc_chunks USING hnsw (embedding vector_cosine_ops);
