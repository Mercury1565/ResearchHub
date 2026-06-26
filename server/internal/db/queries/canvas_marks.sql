-- name: ListCanvasMarksByDocument :many
SELECT id, document_id, page_number, mark_type, data, style, created_at
FROM canvas_marks WHERE document_id = $1 ORDER BY page_number, created_at;

-- name: CreateCanvasMark :one
INSERT INTO canvas_marks (document_id, page_number, mark_type, data, style)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, document_id, page_number, mark_type, data, style, created_at;

-- name: UpdateCanvasMark :one
UPDATE canvas_marks SET data = $2, style = $3 WHERE id = $1
RETURNING id, document_id, page_number, mark_type, data, style, created_at;

-- name: DeleteCanvasMark :exec
DELETE FROM canvas_marks WHERE id = $1;
