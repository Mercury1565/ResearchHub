-- 005_users.up.sql
-- Add user accounts and scope projects to users.

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE projects
    ADD COLUMN user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE;
