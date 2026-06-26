package services

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"strings"

	lpdf "github.com/ledongthuc/pdf"
	"github.com/researchhub/server/internal/models"
)

type PDFService interface {
	ExtractText(ctx context.Context, r io.Reader) ([]models.PageText, error)
}

type pdfService struct{}

func NewPDFService() PDFService {
	return &pdfService{}
}

func (s *pdfService) ExtractText(_ context.Context, r io.Reader) ([]models.PageText, error) {
	data, err := io.ReadAll(r)
	if err != nil {
		return nil, fmt.Errorf("pdf.ExtractText: read: %w", err)
	}

	reader, err := lpdf.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, fmt.Errorf("pdf.ExtractText: open: %w", err)
	}

	var pages []models.PageText
	for i := 1; i <= reader.NumPage(); i++ {
		page := reader.Page(i)
		if page.V.IsNull() {
			continue
		}
		text, err := extractPageText(page)
		if err != nil {
			continue
		}
		text = strings.TrimSpace(text)
		if text == "" {
			continue
		}
		pages = append(pages, models.PageText{Page: i, Text: text})
	}
	return pages, nil
}

func extractPageText(page lpdf.Page) (string, error) {
	rows, err := page.GetTextByRow()
	if err != nil {
		return "", err
	}
	var sb strings.Builder
	for _, row := range rows {
		for _, word := range row.Content {
			sb.WriteString(word.S)
		}
		sb.WriteString("\n")
	}
	return sb.String(), nil
}
