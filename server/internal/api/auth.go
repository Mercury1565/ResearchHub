package api

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"

	dbgen "github.com/researchhub/server/internal/db/generated"
	"github.com/researchhub/server/internal/services"
)

// RegisterRequest is the body for POST /auth/register.
type RegisterRequest struct {
	Email    string `json:"email"    example:"user@example.com"`
	Password string `json:"password" example:"s3cret"`
}

// LoginRequest is the body for POST /auth/login.
type LoginRequest struct {
	Email    string `json:"email"    example:"user@example.com"`
	Password string `json:"password" example:"s3cret"`
}

// AuthResponse is returned after a successful register or login.
type AuthResponse struct {
	Token string     `json:"token"`
	User  UserPublic `json:"user"`
}

// UserPublic is the public-facing user representation.
type UserPublic struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	CreatedAt string `json:"created_at"`
}

// Register creates a new user account.
//
// @Summary      Register
// @Description  Creates a new user account and returns a JWT.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body      RegisterRequest  true  "Email and password"
// @Success      201   {object}  AuthResponse
// @Failure      400   {object}  ErrorResponse
// @Failure      409   {object}  ErrorResponse
// @Failure      500   {object}  ErrorResponse
// @Router       /auth/register [post]
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, http.StatusBadRequest, "invalid body")
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Email == "" || req.Password == "" {
		RespondError(w, http.StatusBadRequest, "email and password are required")
		return
	}
	if len(req.Password) < 8 {
		RespondError(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}

	hash, err := services.HashPassword(req.Password)
	if err != nil {
		slog.Error("Register: hash password", "err", err)
		RespondError(w, http.StatusInternalServerError, "could not create account")
		return
	}

	user, err := h.queries.CreateUser(r.Context(), dbgen.CreateUserParams{
		Email:        req.Email,
		PasswordHash: hash,
	})
	if err != nil {
		// Unique violation — email already taken
		if strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate") {
			RespondError(w, http.StatusConflict, "email already in use")
			return
		}
		slog.Error("Register: create user", "err", err)
		RespondError(w, http.StatusInternalServerError, "could not create account")
		return
	}

	userID := uuidStr(user.ID)
	token, err := services.GenerateToken(userID, h.cfg.JWTSecret)
	if err != nil {
		slog.Error("Register: generate token", "err", err)
		RespondError(w, http.StatusInternalServerError, "could not create account")
		return
	}

	RespondJSON(w, http.StatusCreated, AuthResponse{
		Token: token,
		User:  mapUserPublic(user),
	})
}

// Login authenticates a user and returns a JWT.
//
// @Summary      Login
// @Description  Authenticates a user and returns a JWT.
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body      LoginRequest  true  "Email and password"
// @Success      200   {object}  AuthResponse
// @Failure      400   {object}  ErrorResponse
// @Failure      401   {object}  ErrorResponse
// @Failure      500   {object}  ErrorResponse
// @Router       /auth/login [post]
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		RespondError(w, http.StatusBadRequest, "invalid body")
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Email == "" || req.Password == "" {
		RespondError(w, http.StatusBadRequest, "email and password are required")
		return
	}

	user, err := h.queries.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		RespondError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	if !services.CheckPassword(user.PasswordHash, req.Password) {
		RespondError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	userID := uuidStr(user.ID)
	token, err := services.GenerateToken(userID, h.cfg.JWTSecret)
	if err != nil {
		slog.Error("Login: generate token", "err", err)
		RespondError(w, http.StatusInternalServerError, "could not log in")
		return
	}

	RespondJSON(w, http.StatusOK, AuthResponse{
		Token: token,
		User:  mapUserPublic(user),
	})
}
