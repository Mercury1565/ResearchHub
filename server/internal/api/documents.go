package api

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/pgvector/pgvector-go"

	dbgen "github.com/researchhub/server/internal/db/generated"
	"github.com/researchhub/server/internal/services"
)

// ListDocuments lists documents in a project.
//
// @Summary      List documents
// @Description  Returns all documents belonging to a project.
// @Tags         documents
// @Produce      json
// @Param        projectID  path      string  true  "Project UUID"
// @Success      200        {array}   models.Document
// @Failure      400        {object}  ErrorResponse
// @Failure      500        {object}  ErrorResponse
// @Router       /projects/{projectID}/documents [get]
func (h *Handler) ListDocuments(w http.ResponseWriter, r *http.Request) {
	pid, err := pgUUID(chi.URLParam(r, "projectID"))
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid project id")
		return
	}

	rows, err := h.queries.ListDocumentsByProject(r.Context(), pid)
	if err != nil {
		RespondError(w, http.StatusInternalServerError, "could not list documents")
		return
	}
	docs := make([]any, 0, len(rows))
	for _, row := range rows {
		docs = append(docs, mapDocument(row))
	}
	RespondJSON(w, http.StatusOK, docs)
}

// UploadDocument uploads a PDF to a project.
//
// @Summary      Upload document
// @Description  Uploads a PDF file and begins async text extraction and embedding.
// @Tags         documents
// @Accept       multipart/form-data
// @Produce      json
// @Param        projectID  path      string  true   "Project UUID"
// @Param        file       formData  file    true   "PDF file (max 25 MB)"
// @Success      201        {object}  models.Document
// @Failure      400        {object}  ErrorResponse
// @Failure      500        {object}  ErrorResponse
// @Router       /projects/{projectID}/documents [post]
func (h *Handler) UploadDocument(w http.ResponseWriter, r *http.Request) {
	pid, err := pgUUID(chi.URLParam(r, "projectID"))
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid project id")
		return
	}

	if err := r.ParseMultipartForm(25 << 20); err != nil {
		RespondError(w, http.StatusBadRequest, "file too large or invalid form")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		RespondError(w, http.StatusBadRequest, "missing file field")
		return
	}
	defer file.Close()

	buf := make([]byte, 512)
	n, _ := file.Read(buf)
	contentType := http.DetectContentType(buf[:n])
	if contentType != "application/pdf" {
		RespondError(w, http.StatusBadRequest, "only PDF files are accepted")
		return
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		RespondError(w, http.StatusInternalServerError, "file read error")
		return
	}

	pdfBytes, err := io.ReadAll(file)
	if err != nil {
		RespondError(w, http.StatusInternalServerError, "could not read file")
		return
	}

	docID := uuid.New().String()
	storageKey := fmt.Sprintf("pdfs/%s.pdf", docID)

	if err := h.storage.Upload(r.Context(), storageKey, bytes.NewReader(pdfBytes), int64(len(pdfBytes))); err != nil {
		RespondError(w, http.StatusInternalServerError, "could not store file")
		return
	}

	row, err := h.queries.CreateDocument(r.Context(), dbgen.CreateDocumentParams{
		ProjectID:   pid,
		FileName:    header.Filename,
		StoragePath: storageKey,
	})
	if err != nil {
		_ = h.storage.Delete(r.Context(), storageKey)
		RespondError(w, http.StatusInternalServerError, "could not create document record")
		return
	}

	docUUID := row.ID
	go h.processDocument(docUUID, pdfBytes)

	RespondJSON(w, http.StatusCreated, mapDocument(row))
}

func (h *Handler) processDocument(docID pgtype.UUID, pdfBytes []byte) {
	ctx := context.Background()
	docIDStr := uuidStr(docID)

	pages, err := h.pdf.ExtractText(ctx, bytes.NewReader(pdfBytes))
	if err != nil {
		slog.Error("pdf extraction failed", "doc_id", docIDStr, "err", err)
		return
	}

	chunks := services.ChunkText(pages, 0)
	embedded := 0
	for _, chunk := range chunks {
		vec, err := h.embedding.Embed(ctx, chunk.Text)
		if err != nil {
			slog.Error("embedding failed", "doc_id", docIDStr, "page", chunk.PageNumber, "err", err)
			continue
		}
		if err := h.queries.CreateChunk(ctx, dbgen.CreateChunkParams{
			DocumentID:  docID,
			PageNumber:  int32(chunk.PageNumber),
			TextContent: chunk.Text,
			Embedding:   pgvector.NewVector(vec),
		}); err != nil {
			slog.Error("chunk insert failed", "doc_id", docIDStr, "err", err)
			continue
		}
		embedded++
	}
	slog.Info("document processed", "doc_id", docIDStr, "pages", len(pages), "chunks", embedded)
}

// GetDocument returns document metadata.
//
// @Summary      Get document
// @Description  Returns metadata for a single document.
// @Tags         documents
// @Produce      json
// @Param        documentID  path      string  true  "Document UUID"
// @Success      200         {object}  models.Document
// @Failure      400         {object}  ErrorResponse
// @Failure      404         {object}  ErrorResponse
// @Router       /documents/{documentID} [get]
func (h *Handler) GetDocument(w http.ResponseWriter, r *http.Request) {
	id, err := pgUUID(chi.URLParam(r, "documentID"))
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid document id")
		return
	}

	row, err := h.queries.GetDocument(r.Context(), id)
	if err != nil {
		RespondError(w, http.StatusNotFound, "document not found")
		return
	}
	RespondJSON(w, http.StatusOK, mapDocument(row))
}

// ServeDocumentFile returns a presigned URL for downloading the PDF.
//
// @Summary      Get document file URL
// @Description  Returns a short-lived presigned URL to fetch the PDF.
// @Tags         documents
// @Produce      json
// @Param        documentID  path      string  true  "Document UUID"
// @Success      200         {object}  map[string]string
// @Failure      400         {object}  ErrorResponse
// @Failure      404         {object}  ErrorResponse
// @Failure      500         {object}  ErrorResponse
// @Router       /documents/{documentID}/file [get]
func (h *Handler) ServeDocumentFile(w http.ResponseWriter, r *http.Request) {
	id, err := pgUUID(chi.URLParam(r, "documentID"))
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid document id")
		return
	}

	doc, err := h.queries.GetDocument(r.Context(), id)
	if err != nil {
		RespondError(w, http.StatusNotFound, "document not found")
		return
	}

	url, err := h.storage.PresignedURL(r.Context(), doc.StoragePath, 15*time.Minute)
	if err != nil {
		RespondError(w, http.StatusInternalServerError, "could not generate file url")
		return
	}
	RespondJSON(w, http.StatusOK, map[string]string{"url": url})
}
