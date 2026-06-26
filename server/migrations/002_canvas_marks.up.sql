CREATE TABLE canvas_marks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number INT NOT NULL,
    mark_type   TEXT NOT NULL CHECK (mark_type IN ('pen', 'arrow', 'text')),
    data        JSONB NOT NULL,
    style       JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
