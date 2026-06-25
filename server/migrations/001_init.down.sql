-- migrations/001_init.down.sql

DROP TABLE IF EXISTS annotations;
DROP TABLE IF EXISTS doc_chunks;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS projects;
DROP EXTENSION IF EXISTS vector;
DROP EXTENSION IF EXISTS "pgcrypto";
