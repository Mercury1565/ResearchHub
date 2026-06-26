DROP INDEX IF EXISTS doc_chunks_embedding_idx;
ALTER TABLE doc_chunks DROP COLUMN IF EXISTS embedding;
DROP EXTENSION IF EXISTS vector;
