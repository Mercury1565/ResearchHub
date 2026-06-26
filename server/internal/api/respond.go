package api

import (
	"encoding/json"
	"net/http"

	"github.com/researchhub/server/internal/models"
)

// ErrorResponse is returned on all 4xx and 5xx responses.
type ErrorResponse struct {
	Error string `json:"error" example:"invalid request body"`
}

// CreateProjectRequest is the body for POST /projects.
type CreateProjectRequest struct {
	Name string `json:"name" example:"My Research Project"`
}

// RenameProjectRequest is the body for PUT /projects/{projectID}.
type RenameProjectRequest struct {
	Name string `json:"name" example:"Renamed Project"`
}

// CreateAnnotationRequest is the body for POST /documents/{documentID}/annotations.
type CreateAnnotationRequest struct {
	PageNumber   int               `json:"page_number" example:"1"`
	SelectionTxt string            `json:"selection_txt" example:"selected text"`
	Coordinates  models.Coordinates `json:"coordinates"`
	NoteContent  *string           `json:"note_content"`
	FontStyle    string            `json:"font_style" example:"sans-serif"`
	FontSize     string            `json:"font_size" example:"medium"`
}

// UpdateAnnotationRequest is the body for PUT /annotations/{annotationID}.
type UpdateAnnotationRequest struct {
	NoteContent *string `json:"note_content"`
	FontStyle   string  `json:"font_style" example:"sans-serif"`
	FontSize    string  `json:"font_size" example:"medium"`
}

// ChatRequest is the body for POST /projects/{projectID}/chat.
type ChatRequest struct {
	Message string `json:"message" example:"Summarize the key findings"`
}

func RespondJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func RespondError(w http.ResponseWriter, status int, msg string) {
	RespondJSON(w, status, ErrorResponse{Error: msg})
}
