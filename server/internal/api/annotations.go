package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	dbgen "github.com/researchhub/server/internal/db/generated"
)

// ListAnnotations lists annotations for a document.
//
// @Summary      List annotations
// @Description  Returns all annotations for a document ordered by page and creation time.
// @Tags         annotations
// @Produce      json
// @Param        documentID  path      string  true  "Document UUID"
// @Success      200         {array}   models.Annotation
// @Failure      400         {object}  ErrorResponse
// @Failure      500         {object}  ErrorResponse
// @Router       /documents/{documentID}/annotations [get]
func (h *Handler) ListAnnotations(w http.ResponseWriter, r *http.Request) {
	docID, err := pgUUID(chi.URLParam(r, "documentID"))
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid document id")
		return
	}

	doc, err := h.queries.GetDocument(r.Context(), docID)
	if err != nil {
		RespondError(w, http.StatusNotFound, "document not found")
		return
	}
	projectID := uuidStr(doc.ProjectID)

	rows, err := h.queries.ListAnnotationsByDocument(r.Context(), docID)
	if err != nil {
		RespondError(w, http.StatusInternalServerError, "could not list annotations")
		return
	}

	annotations := make([]any, 0, len(rows))
	for _, row := range rows {
		ann, err := mapAnnotation(row, projectID)
		if err != nil {
			continue
		}
		annotations = append(annotations, ann)
	}
	RespondJSON(w, http.StatusOK, annotations)
}

// CreateAnnotation creates a new annotation on a document.
//
// @Summary      Create annotation
// @Description  Creates a highlight annotation with optional sticky note.
// @Tags         annotations
// @Accept       json
// @Produce      json
// @Param        documentID  path      string                   true  "Document UUID"
// @Param        body        body      CreateAnnotationRequest  true  "Annotation data"
// @Success      201         {object}  models.Annotation
// @Failure      400         {object}  ErrorResponse
// @Failure      500         {object}  ErrorResponse
// @Router       /documents/{documentID}/annotations [post]
func (h *Handler) CreateAnnotation(w http.ResponseWriter, r *http.Request) {
	docID, err := pgUUID(chi.URLParam(r, "documentID"))
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid document id")
		return
	}

	var req CreateAnnotationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, http.StatusBadRequest, "invalid body")
		return
	}

	coordsJSON, err := json.Marshal(req.Coordinates)
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid coordinates")
		return
	}

	var noteContent pgtype.Text
	if req.NoteContent != nil {
		noteContent = pgtype.Text{String: *req.NoteContent, Valid: true}
	}

	doc, err := h.queries.GetDocument(r.Context(), docID)
	if err != nil {
		RespondError(w, http.StatusNotFound, "document not found")
		return
	}
	projectID := uuidStr(doc.ProjectID)

	row, err := h.queries.CreateAnnotation(r.Context(), dbgen.CreateAnnotationParams{
		DocumentID:   docID,
		PageNumber:   int32(req.PageNumber),
		SelectionTxt: req.SelectionTxt,
		Coordinates:  coordsJSON,
		NoteContent:  noteContent,
		FontStyle:    req.FontStyle,
		FontSize:     req.FontSize,
	})
	if err != nil {
		RespondError(w, http.StatusInternalServerError, "could not create annotation")
		return
	}

	ann, err := mapAnnotation(row, projectID)
	if err != nil {
		RespondError(w, http.StatusInternalServerError, "could not map annotation")
		return
	}
	RespondJSON(w, http.StatusCreated, ann)
}

// UpdateAnnotation updates an annotation's note and style.
//
// @Summary      Update annotation
// @Description  Updates the note content, font style, and font size of an annotation.
// @Tags         annotations
// @Accept       json
// @Produce      json
// @Param        annotationID  path      string                   true  "Annotation UUID"
// @Param        body          body      UpdateAnnotationRequest  true  "Updated fields"
// @Success      200           {object}  models.Annotation
// @Failure      400           {object}  ErrorResponse
// @Failure      404           {object}  ErrorResponse
// @Router       /annotations/{annotationID} [put]
func (h *Handler) UpdateAnnotation(w http.ResponseWriter, r *http.Request) {
	annID, err := pgUUID(chi.URLParam(r, "annotationID"))
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid annotation id")
		return
	}

	var req UpdateAnnotationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, http.StatusBadRequest, "invalid body")
		return
	}

	var noteContent pgtype.Text
	if req.NoteContent != nil {
		noteContent = pgtype.Text{String: *req.NoteContent, Valid: true}
	}

	row, err := h.queries.UpdateAnnotation(r.Context(), dbgen.UpdateAnnotationParams{
		ID:          annID,
		NoteContent: noteContent,
		FontStyle:   req.FontStyle,
		FontSize:    req.FontSize,
	})
	if err != nil {
		RespondError(w, http.StatusNotFound, "annotation not found")
		return
	}

	// Fetch the document to get project ID for deep link
	doc, err := h.queries.GetDocument(r.Context(), row.DocumentID)
	if err != nil {
		RespondError(w, http.StatusInternalServerError, "could not resolve document")
		return
	}

	ann, err := mapAnnotation(row, uuidStr(doc.ProjectID))
	if err != nil {
		RespondError(w, http.StatusInternalServerError, "could not map annotation")
		return
	}
	RespondJSON(w, http.StatusOK, ann)
}

// DeleteAnnotation deletes an annotation.
//
// @Summary      Delete annotation
// @Description  Permanently deletes an annotation.
// @Tags         annotations
// @Param        annotationID  path  string  true  "Annotation UUID"
// @Success      204
// @Failure      400  {object}  ErrorResponse
// @Failure      500  {object}  ErrorResponse
// @Router       /annotations/{annotationID} [delete]
func (h *Handler) DeleteAnnotation(w http.ResponseWriter, r *http.Request) {
	annID, err := pgUUID(chi.URLParam(r, "annotationID"))
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid annotation id")
		return
	}

	if err := h.queries.DeleteAnnotation(r.Context(), annID); err != nil {
		RespondError(w, http.StatusInternalServerError, "could not delete annotation")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
