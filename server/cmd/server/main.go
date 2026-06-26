// @title           ResearchHub API
// @version         1.0
// @description     REST API for the ResearchHub research workspace.
// @termsOfService  http://swagger.io/terms/

// @contact.name   ResearchHub Support
// @contact.email  support@researchhub.dev

// @license.name  MIT

// @host      localhost:8080
// @BasePath  /api

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization

package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"
	"github.com/researchhub/server/config"
	"github.com/researchhub/server/internal/api"
	"github.com/researchhub/server/internal/db"
	dbgen "github.com/researchhub/server/internal/db/generated"
	"github.com/researchhub/server/internal/services"
)

func main() {
	_ = godotenv.Load()

	cfg := config.Load()

	pool, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to connect to database", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	queries := dbgen.New(pool)

	storageSvc, err := services.NewStorageService(cfg)
	if err != nil {
		slog.Error("failed to init storage service", "err", err)
		os.Exit(1)
	}

	pdfSvc := services.NewPDFService()

	embeddingSvc, err := services.NewEmbeddingService(cfg)
	if err != nil {
		slog.Error("failed to init embedding service", "err", err)
		os.Exit(1)
	}

	ragSvc, err := services.NewRAGService(queries, embeddingSvc, cfg)
	if err != nil {
		slog.Error("failed to init rag service", "err", err)
		os.Exit(1)
	}

	router := api.NewRouter(queries, storageSvc, pdfSvc, embeddingSvc, ragSvc, cfg)

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		slog.Info("server starting", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "err", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("shutdown error", "err", err)
	}
	slog.Info("server stopped")
}
