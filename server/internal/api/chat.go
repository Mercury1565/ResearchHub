package api

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/researchhub/server/internal/models"
)

// StreamChat streams AI responses for a project.
//
// @Summary      Stream AI chat
// @Description  Streams token-by-token AI responses over Server-Sent Events (SSE).
//
//	Set Accept: text/event-stream. Each event is a JSON token chunk.
//	A final event with data: [DONE] signals end of stream.
//
// @Tags         chat
// @Accept       json
// @Produce      text/event-stream
// @Param        projectID  path      string       true  "Project UUID"
// @Param        body       body      ChatRequest  true  "User message"
// @Success      200        {string}  string       "SSE stream"
// @Failure      400        {object}  ErrorResponse
// @Router       /projects/{projectID}/chat [post]
func (h *Handler) StreamChat(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "projectID")
	if _, err := pgUUID(projectID); err != nil {
		RespondError(w, http.StatusBadRequest, "invalid project id")
		return
	}

	var req ChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Message == "" {
		RespondError(w, http.StatusBadRequest, "message is required")
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		RespondError(w, http.StatusInternalServerError, "streaming not supported")
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	onToken := func(token string) {
		data, _ := json.Marshal(map[string]string{"token": token})
		fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
	}

	onCitations := func(citations []models.Citation) {
		data, _ := json.Marshal(map[string]any{"citations": citations})
		fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
	}

	if err := h.rag.StreamChat(r.Context(), projectID, req.Message, onToken, onCitations); err != nil {
		slog.Error("chat stream error", "err", err)
		errData, _ := json.Marshal(map[string]string{"error": err.Error()})
		fmt.Fprintf(w, "data: %s\n\n", errData)
		flusher.Flush()
	}

	fmt.Fprintf(w, "data: [DONE]\n\n")
	flusher.Flush()
}
