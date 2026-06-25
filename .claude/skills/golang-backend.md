---
name: golang-backend
description: >
  ResearchHub Golang backend development skill. Use this skill whenever working on
  the ResearchHub backend API — including creating new endpoints, adding middleware,
  modifying database models, writing migration files, implementing RAG/vector search,
  handling PDF ingestion, or structuring Go packages. Trigger this skill any time
  the user mentions "backend", "API", "Go", "Golang", "handler", "middleware",
  "migration", "pgvector", "RAG", "embedding", or references any file under the
  backend/ directory.
---

# ResearchHub — Golang Backend Skill

## Project Stack

| Layer         | Technology                                          |
|---------------|-----------------------------------------------------|
| Language      | Go 1.22+                                            |
| HTTP Router   | `chi` (`github.com/go-chi/chi/v5`)                  |
| ORM / DB      | `sqlc` for type-safe queries + `pgx/v5` driver       |
| Migrations    | `golang-migrate/migrate`                            |
| Vector Store  | PostgreSQL + `pgvector` extension                   |
| PDF Parsing   | `pdfcpu` (`github.com/pdfcpu/pdfcpu`)               |
| LLM / RAG     | Anthropic API via `anthropic-sdk-go`                |
| Config        | `godotenv` + environment variables                  |
| Testing       | standard `testing` + `testify`                      |

---

## Project Layout

```
backend/
├── cmd/
│   └── server/
│       └── main.go          # Entry point — wires everything together
├── internal/
│   ├── api/
│   │   ├── router.go        # chi router setup, global middleware
│   │   ├── projects.go      # /projects handlers
│   │   ├── documents.go     # /documents handlers (upload, fetch)
│   │   ├── annotations.go   # /annotations handlers (CRUD)
│   │   └── chat.go          # /chat streaming handler
│   ├── db/
│   │   ├── db.go            # DB connection pool (pgx)
│   │   ├── queries/         # .sql files consumed by sqlc
│   │   └── generated/       # sqlc-generated Go types & queriers
│   ├── models/
│   │   └── models.go        # Canonical Go structs (mirror schema)
│   ├── services/
│   │   ├── pdf.go           # PDF ingestion & text extraction
│   │   ├── embedding.go     # Chunking + embedding via Anthropic API
│   │   ├── rag.go           # Vector search + prompt construction
│   │   └── storage.go       # File storage (local disk or S3)
│   └── middleware/
│       ├── auth.go          # JWT / session validation
│       ├── cors.go          # CORS headers
│       └── logger.go        # Request logging (slog)
├── migrations/
│   ├── 001_init.up.sql
│   ├── 001_init.down.sql
│   └── ...
├── config/
│   └── config.go            # Config struct populated from env
├── go.mod
├── go.sum
└── .env.example
```

---

## Core Data Schema

Always keep these models in sync with `migrations/` SQL and `internal/models/models.go`.

```sql
-- migrations/001_init.up.sql (canonical reference)

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE projects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
    embedding    vector(1536)     -- dimension matches your embedding model
);

CREATE TABLE annotations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id   UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number   INT NOT NULL,
    selection_txt TEXT NOT NULL,
    coordinates   JSONB NOT NULL,  -- {x, y, width, height}
    note_content  TEXT,
    font_style    TEXT NOT NULL DEFAULT 'sans-serif',
    font_size     TEXT NOT NULL DEFAULT 'medium',  -- small | medium | large
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vector similarity index
CREATE INDEX ON doc_chunks USING hnsw (embedding vector_cosine_ops);
```

---

## Coding Conventions

### Package Structure
- Keep `internal/` strictly internal — nothing outside `cmd/` should import across the boundary.
- Services depend on DB interfaces, not concrete types (makes mocking easy).
- Handlers call services; services call DB; DB calls `pgx` — never skip a layer.

### Error Handling
- Always wrap errors: `fmt.Errorf("pdf.Extract: %w", err)`.
- HTTP handlers translate errors to JSON using a shared helper:

```go
// internal/api/respond.go
func RespondError(w http.ResponseWriter, status int, msg string) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
```

### Handler Pattern

```go
// internal/api/projects.go
func (h *Handler) CreateProject(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Name string `json:"name"`
    }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        RespondError(w, http.StatusBadRequest, "invalid body")
        return
    }
    project, err := h.projects.Create(r.Context(), req.Name)
    if err != nil {
        RespondError(w, http.StatusInternalServerError, "could not create project")
        return
    }
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(project)
}
```

### PDF Ingestion Flow (FR-P3)

```
Upload request
  → store raw PDF to disk / S3 (services/storage.go)
  → extract text per page (services/pdf.go via pdfcpu)
  → chunk by paragraph (services/embedding.go)
  → call Anthropic embeddings API for each chunk
  → insert doc_chunks rows with embedding vector
```

### RAG Chat Flow (FR-C1 → FR-C3)

```
/chat POST { project_id, message }
  → embed the user query (same model as ingestion)
  → pgvector cosine similarity search scoped to project_id
  → build context prompt from top-K chunks with citation metadata
  → stream Anthropic response back via SSE
  → each citation includes {doc_title, page_number}
```

SSE streaming example:
```go
w.Header().Set("Content-Type", "text/event-stream")
w.Header().Set("Cache-Control", "no-cache")
flusher := w.(http.Flusher)
// write chunks: fmt.Fprintf(w, "data: %s\n\n", chunk); flusher.Flush()
```

---

## API Routes

| Method | Path                                    | Description                        |
|--------|-----------------------------------------|------------------------------------|
| GET    | /api/projects                           | List all projects                  |
| POST   | /api/projects                           | Create project                     |
| PUT    | /api/projects/{id}                      | Rename project                     |
| DELETE | /api/projects/{id}                      | Delete project                     |
| POST   | /api/projects/{id}/documents            | Upload PDF                         |
| GET    | /api/projects/{id}/documents            | List documents in project          |
| GET    | /api/documents/{id}                     | Fetch document metadata            |
| GET    | /api/documents/{id}/file                | Serve raw PDF bytes                |
| POST   | /api/documents/{id}/annotations         | Create annotation                  |
| GET    | /api/documents/{id}/annotations         | List annotations for document      |
| PUT    | /api/annotations/{id}                   | Update annotation                  |
| DELETE | /api/annotations/{id}                   | Delete annotation                  |
| POST   | /api/projects/{id}/chat                 | Stream AI chat (SSE)               |

---

## Cross-Document URI (FR-X1)

Generate URIs in the format:
```
researchhub://project/{project_id}/doc/{doc_id}?page={N}&highlight={annotation_id}
```

Return this URI in every `POST /annotations` response as `deep_link`.

---

## Environment Variables (.env.example)

```
DATABASE_URL=postgres://user:pass@localhost:5432/researchhub?sslmode=disable
ANTHROPIC_API_KEY=sk-ant-...
STORAGE_PATH=./uploads          # local disk path for PDFs
PORT=8080
ALLOWED_ORIGINS=http://localhost:5173
```

---

## Key Rules

1. Never embed raw SQL in handler files — all queries go in `internal/db/queries/*.sql` and are generated by `sqlc`.
2. PDF uploads must be validated for size (≤ 25 MB) and MIME type (`application/pdf`) before any processing.
3. All UUIDs use `github.com/google/uuid` — never `string` IDs.
4. Vector search must always be scoped by `project_id` via a JOIN — never do a full-table ANN search.
5. Streaming chat responses must flush on every token to meet the 2.5-second first-token latency target.
6. CORS middleware must allow `Content-Type`, `Authorization`, and `X-Request-ID` headers.
