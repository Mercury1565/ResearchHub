package api

import (
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5/pgtype"
	dbgen "github.com/researchhub/server/internal/db/generated"
	"github.com/researchhub/server/internal/models"
)

func pgUUID(s string) (pgtype.UUID, error) {
	var u pgtype.UUID
	if err := u.Scan(s); err != nil {
		return u, fmt.Errorf("invalid uuid %q: %w", s, err)
	}
	return u, nil
}

func uuidStr(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	return fmt.Sprintf("%x-%x-%x-%x-%x", u.Bytes[0:4], u.Bytes[4:6], u.Bytes[6:8], u.Bytes[8:10], u.Bytes[10:16])
}

func mapProject(row dbgen.Project) models.Project {
	return models.Project{
		ID:        uuidStr(row.ID),
		Name:      row.Name,
		CreatedAt: row.CreatedAt.Time,
	}
}

func mapDocument(row dbgen.Document) models.Document {
	return models.Document{
		ID:          uuidStr(row.ID),
		ProjectID:   uuidStr(row.ProjectID),
		FileName:    row.FileName,
		StoragePath: row.StoragePath,
		CreatedAt:   row.CreatedAt.Time,
	}
}

func mapCanvasMark(row dbgen.CanvasMark) models.CanvasMark {
	return models.CanvasMark{
		ID:         uuidStr(row.ID),
		DocumentID: uuidStr(row.DocumentID),
		PageNumber: int(row.PageNumber),
		MarkType:   row.MarkType,
		Data:       row.Data,
		Style:      row.Style,
		CreatedAt:  row.CreatedAt.Time,
	}
}

func mapAnnotation(row dbgen.Annotation, projectID string) (models.Annotation, error) {
	var coords models.Coordinates
	if err := json.Unmarshal(row.Coordinates, &coords); err != nil {
		return models.Annotation{}, fmt.Errorf("mapAnnotation: coordinates: %w", err)
	}

	docID := uuidStr(row.DocumentID)
	annID := uuidStr(row.ID)

	var noteContent *string
	if row.NoteContent.Valid {
		noteContent = &row.NoteContent.String
	}

	return models.Annotation{
		ID:           annID,
		DocumentID:   docID,
		PageNumber:   int(row.PageNumber),
		SelectionTxt: row.SelectionTxt,
		Coordinates:  coords,
		NoteContent:  noteContent,
		FontStyle:    row.FontStyle,
		FontSize:     row.FontSize,
		DeepLink:     fmt.Sprintf("researchhub://project/%s/doc/%s?page=%d&highlight=%s", projectID, docID, row.PageNumber, annID),
		CreatedAt:    row.CreatedAt.Time,
	}, nil
}
