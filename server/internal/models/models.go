package models

import "time"

type Project struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

type Document struct {
	ID          string    `json:"id"`
	ProjectID   string    `json:"project_id"`
	FileName    string    `json:"file_name"`
	StoragePath string    `json:"-"` // never expose internal path
	CreatedAt   time.Time `json:"created_at"`
}

type DocChunk struct {
	ID          string `json:"id"`
	DocumentID  string `json:"document_id"`
	PageNumber  int    `json:"page_number"`
	TextContent string `json:"text_content"`
	// Embedding stored as pgvector — not exposed in JSON
}

type Coordinates struct {
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Width  float64 `json:"width"`
	Height float64 `json:"height"`
}

type Annotation struct {
	ID           string      `json:"id"`
	DocumentID   string      `json:"document_id"`
	PageNumber   int         `json:"page_number"`
	SelectionTxt string      `json:"selection_txt"`
	Coordinates  Coordinates `json:"coordinates"`
	NoteContent  *string     `json:"note_content"`
	FontStyle    string      `json:"font_style"`
	FontSize     string      `json:"font_size"`
	DeepLink     string      `json:"deep_link"` // researchhub:// URI
	CreatedAt    time.Time   `json:"created_at"`
}
