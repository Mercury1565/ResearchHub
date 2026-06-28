package api

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/researchhub/server/internal/models"
)

// ChatResponse is returned by POST /projects/{projectID}/chat.
type ChatResponse struct {
	Message   string            `json:"message"`
	Citations []models.Citation `json:"citations,omitempty"`
}

// StreamChat handles AI chat for a project.
//
// @Summary      Chat
// @Description  Sends a message and returns the full AI response as JSON.
// @Tags         chat
// @Accept       json
// @Produce      json
// @Param        projectID  path      string       true  "Project UUID"
// @Param        body       body      ChatRequest  true  "User message"
// @Success      200        {object}  ChatResponse
// @Failure      400        {object}  ErrorResponse
// @Failure      500        {object}  ErrorResponse
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

	var sb strings.Builder
	var citations []models.Citation

	onToken := func(token string) { sb.WriteString(token) }
	onCitations := func(c []models.Citation) { citations = c }

	if err := h.rag.StreamChat(r.Context(), projectID, req.Message, onToken, onCitations); err != nil {
		slog.Error("chat error", "err", err)
		RespondError(w, http.StatusInternalServerError, "chat failed")
		return
	}

	RespondJSON(w, http.StatusOK, ChatResponse{
		Message:   sb.String(),
		Citations: citations,
	})
}
