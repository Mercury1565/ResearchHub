-- name: ListAnnotationsByDocument :many
SELECT id, document_id, page_number, selection_txt, coordinates,
       note_content, font_style, font_size, created_at
FROM annotations WHERE document_id = $1 ORDER BY page_number, created_at;

-- name: CreateAnnotation :one
INSERT INTO annotations (document_id, page_number, selection_txt, coordinates,
                         note_content, font_style, font_size)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, document_id, page_number, selection_txt, coordinates,
          note_content, font_style, font_size, created_at;

-- name: GetAnnotation :one
SELECT id, document_id, page_number, selection_txt, coordinates,
       note_content, font_style, font_size, created_at
FROM annotations WHERE id = $1;

-- name: UpdateAnnotation :one
UPDATE annotations
SET note_content = $2, font_style = $3, font_size = $4
WHERE id = $1
RETURNING id, document_id, page_number, selection_txt, coordinates,
          note_content, font_style, font_size, created_at;

-- name: DeleteAnnotation :exec
DELETE FROM annotations WHERE id = $1;
