-- name: ListDocumentsByProject :many
SELECT id, project_id, file_name, storage_path, created_at
FROM documents WHERE project_id = $1 ORDER BY created_at DESC;

-- name: CreateDocument :one
INSERT INTO documents (project_id, file_name, storage_path)
VALUES ($1, $2, $3) RETURNING id, project_id, file_name, storage_path, created_at;

-- name: GetDocument :one
SELECT id, project_id, file_name, storage_path, created_at
FROM documents WHERE id = $1;

-- name: DeleteDocument :exec
DELETE FROM documents WHERE id = $1;
