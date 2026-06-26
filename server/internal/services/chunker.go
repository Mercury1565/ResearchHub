package services

import (
	"strings"

	"github.com/researchhub/server/internal/models"
)

const defaultMaxChars = 2000 // ~500 tokens

func ChunkText(pages []models.PageText, maxChars int) []models.Chunk {
	if maxChars <= 0 {
		maxChars = defaultMaxChars
	}

	var chunks []models.Chunk
	for _, page := range pages {
		paragraphs := splitParagraphs(page.Text)
		var buf strings.Builder

		for _, p := range paragraphs {
			if buf.Len()+len(p) > maxChars && buf.Len() > 0 {
				chunks = append(chunks, models.Chunk{
					PageNumber: page.Page,
					Text:       strings.TrimSpace(buf.String()),
				})
				buf.Reset()
			}
			if len(p) > maxChars {
				if buf.Len() > 0 {
					chunks = append(chunks, models.Chunk{
						PageNumber: page.Page,
						Text:       strings.TrimSpace(buf.String()),
					})
					buf.Reset()
				}
				chunks = append(chunks, models.Chunk{
					PageNumber: page.Page,
					Text:       strings.TrimSpace(p),
				})
				continue
			}
			buf.WriteString(p)
			buf.WriteString("\n\n")
		}

		if buf.Len() > 0 {
			chunks = append(chunks, models.Chunk{
				PageNumber: page.Page,
				Text:       strings.TrimSpace(buf.String()),
			})
		}
	}
	return chunks
}

func splitParagraphs(text string) []string {
	raw := strings.Split(text, "\n\n")
	var result []string
	for _, p := range raw {
		p = strings.TrimSpace(p)
		if p != "" {
			result = append(result, p)
		}
	}
	return result
}
