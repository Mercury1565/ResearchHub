package services

import (
	"context"
	"fmt"

	"google.golang.org/genai"

	"github.com/researchhub/server/config"
)

type EmbeddingService interface {
	Embed(ctx context.Context, text string) ([]float32, error)
}

type geminiEmbedding struct {
	client *genai.Client
	model  string
}

func NewEmbeddingService(cfg *config.Config) (EmbeddingService, error) {
	client, err := genai.NewClient(context.Background(), &genai.ClientConfig{
		APIKey:      cfg.ActiveAPIKey(),
		Backend:     genai.BackendGeminiAPI,
		HTTPOptions: genai.HTTPOptions{APIVersion: "v1"},
	})
	if err != nil {
		return nil, fmt.Errorf("embedding.New: %w", err)
	}
	return &geminiEmbedding{client: client, model: "gemini-embedding-2"}, nil
}

func (e *geminiEmbedding) Embed(ctx context.Context, text string) ([]float32, error) {
	result, err := e.client.Models.EmbedContent(ctx, e.model, genai.Text(text), nil)
	if err != nil {
		return nil, fmt.Errorf("embedding.Embed: %w", err)
	}
	if len(result.Embeddings) == 0 {
		return nil, fmt.Errorf("embedding.Embed: no embeddings returned")
	}
	return result.Embeddings[0].Values, nil
}
