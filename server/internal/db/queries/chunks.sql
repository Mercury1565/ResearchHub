-- name: CreateChunk :exec
INSERT INTO doc_chunks (document_id, page_number, text_content, embedding)
VALUES ($1, $2, $3, $4);

-- name: SearchChunksByProject :many
SELECT dc.id, dc.document_id, dc.page_number, dc.text_content,
       d.file_name
FROM doc_chunks dc
JOIN documents d ON d.id = dc.document_id
WHERE d.project_id = $1
ORDER BY dc.embedding <=> $2
LIMIT $3;
