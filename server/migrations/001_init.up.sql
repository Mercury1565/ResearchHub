-- migrations/001_init.up.sql
-- Core tables — no pgvector dependency.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

-- doc_chunks stores extracted page text. The embedding column is added by
-- migration 003 once pgvector is available.
CREATE TABLE doc_chunks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number  INT NOT NULL,
    text_content TEXT NOT NULL
);

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
