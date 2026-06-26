package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	dbgen "github.com/researchhub/server/internal/db/generated"
)

// ListCanvasMarks lists all canvas marks for a document.
//
// @Summary      List canvas marks
// @Description  Returns all canvas marks (pen, arrow, text) for a document ordered by page and creation time.
// @Tags         annotations
// @Produce      json
// @Param        documentID  path      string  true  "Document UUID"
// @Success      200         {array}   models.CanvasMark
// @Failure      400         {object}  ErrorResponse
// @Failure      500         {object}  ErrorResponse
// @Router       /documents/{documentID}/marks [get]
func (h *Handler) ListCanvasMarks(w http.ResponseWriter, r *http.Request) {
	docID, err := pgUUID(chi.URLParam(r, "documentID"))
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid document id")
		return
	}

	rows, err := h.queries.ListCanvasMarksByDocument(r.Context(), docID)
	if err != nil {
		RespondError(w, http.StatusInternalServerError, "could not list canvas marks")
		return
	}

	marks := make([]any, 0, len(rows))
	for _, row := range rows {
		marks = append(marks, mapCanvasMark(row))
	}
	RespondJSON(w, http.StatusOK, marks)
}

// CreateCanvasMark creates a new canvas mark on a document.
//
// @Summary      Create canvas mark
// @Description  Creates a freehand, arrow, or text mark placed directly on the PDF canvas.
// @Tags         annotations
// @Accept       json
// @Produce      json
// @Param        documentID  path      string                    true  "Document UUID"
// @Param        body        body      CreateCanvasMarkRequest   true  "Mark data"
// @Success      201         {object}  models.CanvasMark
// @Failure      400         {object}  ErrorResponse
// @Failure      500         {object}  ErrorResponse
// @Router       /documents/{documentID}/marks [post]
func (h *Handler) CreateCanvasMark(w http.ResponseWriter, r *http.Request) {
	docID, err := pgUUID(chi.URLParam(r, "documentID"))
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid document id")
		return
	}

	var req CreateCanvasMarkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, http.StatusBadRequest, "invalid body")
		return
	}

	if req.MarkType != "pen" && req.MarkType != "arrow" && req.MarkType != "text" && req.MarkType != "highlight" {
		RespondError(w, http.StatusBadRequest, "mark_type must be pen, arrow, text, or highlight")
		return
	}

	dataJSON, err := json.Marshal(req.Data)
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid data")
		return
	}

	styleJSON, err := json.Marshal(req.Style)
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid style")
		return
	}

	row, err := h.queries.CreateCanvasMark(r.Context(), dbgen.CreateCanvasMarkParams{
		DocumentID: docID,
		PageNumber: int32(req.PageNumber),
		MarkType:   req.MarkType,
		Data:       dataJSON,
		Style:      styleJSON,
	})
	if err != nil {
		RespondError(w, http.StatusInternalServerError, "could not create canvas mark")
		return
	}

	RespondJSON(w, http.StatusCreated, mapCanvasMark(row))
}

// UpdateCanvasMark updates the data and style of a canvas mark (used for moving).
//
// @Summary      Update canvas mark
// @Description  Updates the position/shape data of a canvas mark (move operation).
// @Tags         annotations
// @Accept       json
// @Produce      json
// @Param        markID  path      string                    true  "Mark UUID"
// @Param        body    body      UpdateCanvasMarkRequest   true  "Updated data"
// @Success      200     {object}  models.CanvasMark
// @Failure      400     {object}  ErrorResponse
// @Failure      500     {object}  ErrorResponse
// @Router       /marks/{markID} [put]
func (h *Handler) UpdateCanvasMark(w http.ResponseWriter, r *http.Request) {
	markID, err := pgUUID(chi.URLParam(r, "markID"))
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid mark id")
		return
	}

	var req UpdateCanvasMarkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, http.StatusBadRequest, "invalid body")
		return
	}

	dataJSON, err := json.Marshal(req.Data)
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid data")
		return
	}

	styleJSON, err := json.Marshal(req.Style)
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid style")
		return
	}

	row, err := h.queries.UpdateCanvasMark(r.Context(), dbgen.UpdateCanvasMarkParams{
		ID:    markID,
		Data:  dataJSON,
		Style: styleJSON,
	})
	if err != nil {
		RespondError(w, http.StatusInternalServerError, "could not update canvas mark")
		return
	}

	RespondJSON(w, http.StatusOK, mapCanvasMark(row))
}

// DeleteCanvasMark deletes a canvas mark.
//
// @Summary      Delete canvas mark
// @Description  Permanently removes a canvas mark from the PDF.
// @Tags         annotations
// @Param        markID  path  string  true  "Mark UUID"
// @Success      204
// @Failure      400  {object}  ErrorResponse
// @Failure      500  {object}  ErrorResponse
// @Router       /marks/{markID} [delete]
func (h *Handler) DeleteCanvasMark(w http.ResponseWriter, r *http.Request) {
	markID, err := pgUUID(chi.URLParam(r, "markID"))
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid mark id")
		return
	}

	if err := h.queries.DeleteCanvasMark(r.Context(), markID); err != nil {
		RespondError(w, http.StatusInternalServerError, "could not delete canvas mark")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
