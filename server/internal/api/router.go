package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/researchhub/backend/config"
	"github.com/researchhub/backend/internal/middleware"
)

// Handler holds shared dependencies for all HTTP handlers.
type Handler struct {
	db  *pgxpool.Pool
	cfg *config.Config
}

// NewRouter wires up the chi router with all routes and middleware.
func NewRouter(pool *pgxpool.Pool, cfg *config.Config) http.Handler {
	h := &Handler{db: pool, cfg: cfg}

	r := chi.NewRouter()

	// Global middleware
	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.RealIP)
	r.Use(chiMiddleware.Recoverer)
	r.Use(middleware.Logger)
	r.Use(middleware.CORS(cfg.AllowedOrigins))

	r.Route("/api", func(r chi.Router) {
		// Projects
		r.Route("/projects", func(r chi.Router) {
			r.Get("/", h.ListProjects)
			r.Post("/", h.CreateProject)
			r.Route("/{projectID}", func(r chi.Router) {
				r.Put("/", h.RenameProject)
				r.Delete("/", h.DeleteProject)
				r.Get("/documents", h.ListDocuments)
				r.Post("/documents", h.UploadDocument)
				r.Post("/chat", h.StreamChat)
			})
		})

		// Documents
		r.Route("/documents/{documentID}", func(r chi.Router) {
			r.Get("/", h.GetDocument)
			r.Get("/file", h.ServeDocumentFile)
			r.Get("/annotations", h.ListAnnotations)
			r.Post("/annotations", h.CreateAnnotation)
		})

		// Annotations
		r.Route("/annotations/{annotationID}", func(r chi.Router) {
			r.Put("/", h.UpdateAnnotation)
			r.Delete("/", h.DeleteAnnotation)
		})
	})

	return r
}
