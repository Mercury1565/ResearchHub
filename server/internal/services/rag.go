package services

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/pgvector/pgvector-go"
	"google.golang.org/genai"

	"github.com/researchhub/server/config"
	dbgen "github.com/researchhub/server/internal/db/generated"
	"github.com/researchhub/server/internal/models"
)

type RAGService interface {
	StreamChat(ctx context.Context, projectID string, message string, onToken func(string), onCitations func([]models.Citation)) error
}

type ragService struct {
	queries   *dbgen.Queries
	embedding EmbeddingService
	client    *genai.Client
	model     string
}

func NewRAGService(queries *dbgen.Queries, emb EmbeddingService, cfg *config.Config) (RAGService, error) {
	client, err := genai.NewClient(context.Background(), &genai.ClientConfig{
		APIKey:      cfg.ActiveAPIKey(),
		Backend:     genai.BackendGeminiAPI,
		HTTPOptions: genai.HTTPOptions{APIVersion: "v1"},
	})
	if err != nil {
		return nil, fmt.Errorf("rag.New: %w", err)
	}
	return &ragService{
		queries:   queries,
		embedding: emb,
		client:    client,
		model:     "gemini-2.0-flash-lite",
	}, nil
}

func (s *ragService) StreamChat(ctx context.Context, projectID string, message string, onToken func(string), onCitations func([]models.Citation)) error {
	queryVec, err := s.embedding.Embed(ctx, message)
	if err != nil {
		return fmt.Errorf("rag.StreamChat: embed query: %w", err)
	}

	pid := pgtype.UUID{}
	if err := pid.Scan(projectID); err != nil {
		return fmt.Errorf("rag.StreamChat: invalid project id: %w", err)
	}

	chunks, err := s.queries.SearchChunksByProject(ctx, dbgen.SearchChunksByProjectParams{
		ProjectID: pid,
		Embedding: pgvector.NewVector(queryVec),
		Limit:     5,
	})
	if err != nil {
		return fmt.Errorf("rag.StreamChat: search: %w", err)
	}

	prompt := buildRAGPrompt(chunks, message)
	citations := buildCitations(chunks)

	for resp, err := range s.client.Models.GenerateContentStream(ctx, s.model, genai.Text(prompt), nil) {
		if err != nil {
			return fmt.Errorf("rag.StreamChat: stream: %w", err)
		}
		for _, candidate := range resp.Candidates {
			if candidate.Content == nil {
				continue
			}
			for _, part := range candidate.Content.Parts {
				if part.Text != "" {
					onToken(part.Text)
				}
			}
		}
	}

	onCitations(citations)
	return nil
}

func buildRAGPrompt(chunks []dbgen.SearchChunksByProjectRow, question string) string {
	var sb strings.Builder
	sb.WriteString("Context from research documents:\n\n")
	for _, chunk := range chunks {
		fmt.Fprintf(&sb, "[Source: %s, Page %d]\n%s\n\n", chunk.FileName, chunk.PageNumber, chunk.TextContent)
	}
	fmt.Fprintf(&sb, "User question: %s\n\n", question)
	sb.WriteString("Answer the question based on the provided context. Cite sources as [Source: filename, Page N] when referencing specific information.")
	return sb.String()
}

func buildCitations(chunks []dbgen.SearchChunksByProjectRow) []models.Citation {
	seen := make(map[string]bool)
	var citations []models.Citation
	for _, chunk := range chunks {
		docID := uuidToString(chunk.DocumentID)
		key := fmt.Sprintf("%s-%d", docID, chunk.PageNumber)
		if seen[key] {
			continue
		}
		seen[key] = true
		citations = append(citations, models.Citation{
			DocumentTitle: chunk.FileName,
			PageNumber:    int(chunk.PageNumber),
			DocID:         docID,
		})
	}
	return citations
}

func uuidToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	return fmt.Sprintf("%x-%x-%x-%x-%x", u.Bytes[0:4], u.Bytes[4:6], u.Bytes[6:8], u.Bytes[8:10], u.Bytes[10:16])
}
