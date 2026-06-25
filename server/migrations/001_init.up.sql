-- migrations/001_init.up.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE projects (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE documents (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_name    TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE doc_chunks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number  INT NOT NULL,
    text_content TEXT NOT NULL,
    embedding    vector(1536)
);

-- HNSW index for fast approximate nearest-neighbor search
CREATE INDEX ON doc_chunks USING hnsw (embedding vector_cosine_ops);

CREATE TABLE annotations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id   UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number   INT NOT NULL,
    selection_txt TEXT NOT NULL,
    coordinates   JSONB NOT NULL,
    note_content  TEXT,
    font_style    TEXT NOT NULL DEFAULT 'sans-serif',
    font_size     TEXT NOT NULL DEFAULT 'medium'
        CHECK (font_size IN ('small', 'medium', 'large')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
