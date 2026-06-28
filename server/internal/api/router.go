package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	httpSwagger "github.com/swaggo/http-swagger"

	"github.com/researchhub/server/config"
	dbgen "github.com/researchhub/server/internal/db/generated"
	"github.com/researchhub/server/internal/middleware"
	"github.com/researchhub/server/internal/services"

	_ "github.com/researchhub/server/docs"
)

type Handler struct {
	queries   *dbgen.Queries
	storage   services.StorageService
	pdf       services.PDFService
	embedding services.EmbeddingService
	rag       services.RAGService
	cfg       *config.Config
}

func NewRouter(
	queries *dbgen.Queries,
	storage services.StorageService,
	pdf services.PDFService,
	embedding services.EmbeddingService,
	rag services.RAGService,
	cfg *config.Config,
) http.Handler {
	h := &Handler{
		queries:   queries,
		storage:   storage,
		pdf:       pdf,
		embedding: embedding,
		rag:       rag,
		cfg:       cfg,
	}

	r := chi.NewRouter()

	// Global middleware
	r.Use(chiMiddleware.RequestID)
	r.Use(chiMiddleware.RealIP)
	r.Use(chiMiddleware.Recoverer)
	r.Use(middleware.Logger)
	r.Use(middleware.CORS(cfg.AllowedOrigins))

	r.Get("/swagger/*", httpSwagger.Handler(
		httpSwagger.URL("/swagger/doc.json"),
	))

	r.Route("/api", func(r chi.Router) {
		// Public auth routes — no JWT required
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", h.Register)
			r.Post("/login", h.Login)
		})

		// All routes below require a valid JWT
		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(cfg.JWTSecret))

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
				r.Get("/marks", h.ListCanvasMarks)
				r.Post("/marks", h.CreateCanvasMark)
			})

			// Annotations
			r.Route("/annotations/{annotationID}", func(r chi.Router) {
				r.Put("/", h.UpdateAnnotation)
				r.Delete("/", h.DeleteAnnotation)
			})

			// Canvas marks
			r.Route("/marks/{markID}", func(r chi.Router) {
				r.Put("/", h.UpdateCanvasMark)
				r.Delete("/", h.DeleteCanvasMark)
			})
		})
	})

	return r
}
