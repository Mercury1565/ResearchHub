package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	dbgen "github.com/researchhub/server/internal/db/generated"
	"github.com/researchhub/server/internal/middleware"
)

// ListProjects lists all projects for the authenticated user.
//
// @Summary      List projects
// @Description  Returns all projects for the current user ordered by creation date descending.
// @Tags         projects
// @Produce      json
// @Security     BearerAuth
// @Success      200  {array}   models.Project
// @Failure      401  {object}  ErrorResponse
// @Failure      500  {object}  ErrorResponse
// @Router       /projects [get]
func (h *Handler) ListProjects(w http.ResponseWriter, r *http.Request) {
	userID, err := pgUUID(middleware.UserIDFromCtx(r.Context()))
	if err != nil {
		RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	rows, err := h.queries.ListProjects(r.Context(), userID)
	if err != nil {
		RespondError(w, http.StatusInternalServerError, "could not list projects")
		return
	}
	projects := make([]any, 0, len(rows))
	for _, row := range rows {
		projects = append(projects, mapListProjectsRow(row))
	}
	RespondJSON(w, http.StatusOK, projects)
}

// CreateProject creates a new project for the authenticated user.
//
// @Summary      Create project
// @Description  Creates a new project with the given name.
// @Tags         projects
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        body  body      CreateProjectRequest  true  "Project name"
// @Success      201   {object}  models.Project
// @Failure      400   {object}  ErrorResponse
// @Failure      401   {object}  ErrorResponse
// @Failure      500   {object}  ErrorResponse
// @Router       /projects [post]
func (h *Handler) CreateProject(w http.ResponseWriter, r *http.Request) {
	userID, err := pgUUID(middleware.UserIDFromCtx(r.Context()))
	if err != nil {
		RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req CreateProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Name == "" {
		RespondError(w, http.StatusBadRequest, "name is required")
		return
	}

	row, err := h.queries.CreateProject(r.Context(), dbgen.CreateProjectParams{
		Name:   req.Name,
		UserID: userID,
	})
	if err != nil {
		RespondError(w, http.StatusInternalServerError, "could not create project")
		return
	}
	RespondJSON(w, http.StatusCreated, mapCreateProjectRow(row))
}

// RenameProject renames an existing project.
//
// @Summary      Rename project
// @Description  Updates the name of a project owned by the current user.
// @Tags         projects
// @Accept       json
// @Produce      json
// @Security     BearerAuth
// @Param        projectID  path      string               true  "Project UUID"
// @Param        body       body      RenameProjectRequest  true  "New name"
// @Success      200        {object}  models.Project
// @Failure      400        {object}  ErrorResponse
// @Failure      401        {object}  ErrorResponse
// @Failure      404        {object}  ErrorResponse
// @Failure      500        {object}  ErrorResponse
// @Router       /projects/{projectID} [put]
func (h *Handler) RenameProject(w http.ResponseWriter, r *http.Request) {
	userID, err := pgUUID(middleware.UserIDFromCtx(r.Context()))
	if err != nil {
		RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

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
		ID:     id,
		Name:   req.Name,
		UserID: userID,
	})
	if err != nil {
		RespondError(w, http.StatusNotFound, "project not found")
		return
	}
	RespondJSON(w, http.StatusOK, mapRenameProjectRow(row))
}

// DeleteProject deletes a project and all its documents.
//
// @Summary      Delete project
// @Description  Deletes a project owned by the current user and cascades to documents, chunks, and annotations.
// @Tags         projects
// @Security     BearerAuth
// @Param        projectID  path  string  true  "Project UUID"
// @Success      204
// @Failure      400  {object}  ErrorResponse
// @Failure      401  {object}  ErrorResponse
// @Failure      500  {object}  ErrorResponse
// @Router       /projects/{projectID} [delete]
func (h *Handler) DeleteProject(w http.ResponseWriter, r *http.Request) {
	userID, err := pgUUID(middleware.UserIDFromCtx(r.Context()))
	if err != nil {
		RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

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

	if err := h.queries.DeleteProject(r.Context(), dbgen.DeleteProjectParams{
		ID:     id,
		UserID: userID,
	}); err != nil {
		RespondError(w, http.StatusInternalServerError, "could not delete project")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
