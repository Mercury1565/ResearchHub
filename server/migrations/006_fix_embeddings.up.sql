-- migrations/006_fix_embeddings.up.sql
-- Sets up pgvector with gemini-embedding-2 (3072-dim).
-- HNSW/IVFFlat both cap at 2000 dims, so we use exact search (fine for
-- the document volumes this app handles).

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE doc_chunks DROP COLUMN IF EXISTS embedding;
ALTER TABLE doc_chunks ADD COLUMN embedding vector(3072);
