package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	dbgen "github.com/researchhub/server/internal/db/generated"
)

// ListProjects lists all projects.
//
// @Summary      List projects
// @Description  Returns all projects ordered by creation date descending.
// @Tags         projects
// @Produce      json
// @Success      200  {array}   models.Project
// @Failure      500  {object}  ErrorResponse
// @Router       /projects [get]
func (h *Handler) ListProjects(w http.ResponseWriter, r *http.Request) {
	rows, err := h.queries.ListProjects(r.Context())
	if err != nil {
		RespondError(w, http.StatusInternalServerError, "could not list projects")
		return
	}
	projects := make([]any, 0, len(rows))
	for _, row := range rows {
		projects = append(projects, mapProject(row))
	}
	RespondJSON(w, http.StatusOK, projects)
}

// CreateProject creates a new project.
//
// @Summary      Create project
// @Description  Creates a new project with the given name.
// @Tags         projects
// @Accept       json
// @Produce      json
// @Param        body  body      CreateProjectRequest  true  "Project name"
// @Success      201   {object}  models.Project
// @Failure      400   {object}  ErrorResponse
// @Failure      500   {object}  ErrorResponse
// @Router       /projects [post]
func (h *Handler) CreateProject(w http.ResponseWriter, r *http.Request) {
	var req CreateProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Name == "" {
		RespondError(w, http.StatusBadRequest, "name is required")
		return
	}

	row, err := h.queries.CreateProject(r.Context(), req.Name)
	if err != nil {
		RespondError(w, http.StatusInternalServerError, "could not create project")
		return
	}
	RespondJSON(w, http.StatusCreated, mapProject(row))
}

// RenameProject renames an existing project.
//
// @Summary      Rename project
// @Description  Updates the name of a project.
// @Tags         projects
// @Accept       json
// @Produce      json
// @Param        projectID  path      string               true  "Project UUID"
// @Param        body       body      RenameProjectRequest  true  "New name"
// @Success      200        {object}  models.Project
// @Failure      400        {object}  ErrorResponse
// @Failure      404        {object}  ErrorResponse
// @Failure      500        {object}  ErrorResponse
// @Router       /projects/{projectID} [put]
func (h *Handler) RenameProject(w http.ResponseWriter, r *http.Request) {
	id, err := pgUUID(chi.URLParam(r, "projectID"))
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid project id")
		return
	}

	var req RenameProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Name == "" {
		RespondError(w, http.StatusBadRequest, "name is required")
		return
	}

	row, err := h.queries.RenameProject(r.Context(), dbgen.RenameProjectParams{
		ID:   id,
		Name: req.Name,
	})
	if err != nil {
		RespondError(w, http.StatusNotFound, "project not found")
		return
	}
	RespondJSON(w, http.StatusOK, mapProject(row))
}

// DeleteProject deletes a project and all its documents.
//
// @Summary      Delete project
// @Description  Deletes a project and cascades to documents, chunks, and annotations.
// @Tags         projects
// @Param        projectID  path  string  true  "Project UUID"
// @Success      204
// @Failure      400  {object}  ErrorResponse
// @Failure      500  {object}  ErrorResponse
// @Router       /projects/{projectID} [delete]
func (h *Handler) DeleteProject(w http.ResponseWriter, r *http.Request) {
	id, err := pgUUID(chi.URLParam(r, "projectID"))
	if err != nil {
		RespondError(w, http.StatusBadRequest, "invalid project id")
		return
	}

	docs, err := h.queries.ListDocumentsByProject(r.Context(), id)
	if err == nil {
		for _, doc := range docs {
			_ = h.storage.Delete(r.Context(), doc.StoragePath)
		}
	}

	if err := h.queries.DeleteProject(r.Context(), id); err != nil {
		RespondError(w, http.StatusInternalServerError, "could not delete project")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
