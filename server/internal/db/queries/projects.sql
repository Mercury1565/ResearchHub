-- name: ListProjects :many
SELECT id, name, created_at FROM projects WHERE user_id = $1 ORDER BY created_at DESC;

-- name: CreateProject :one
INSERT INTO projects (name, user_id) VALUES ($1, $2) RETURNING id, name, created_at;

-- name: GetProject :one
SELECT id, name, created_at FROM projects WHERE id = $1 AND user_id = $2;

-- name: RenameProject :one
UPDATE projects SET name = $2 WHERE id = $1 AND user_id = $3 RETURNING id, name, created_at;

-- name: DeleteProject :exec
DELETE FROM projects WHERE id = $1 AND user_id = $2;
