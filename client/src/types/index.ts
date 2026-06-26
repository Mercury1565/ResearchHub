// src/types/index.ts — Canonical types for ResearchHub frontend

export interface Project {
  id: string;
  name: string;
  created_at: string;
}

export interface Document {
  id: string;
  project_id: string;
  file_name: string;
  created_at: string;
}

export type FontStyle = 'sans-serif' | 'caveat' | 'indie-flower' | 'patrick-hand';
export type FontSize  = 'small' | 'medium' | 'large';

export interface Coordinates {
  x: number;      // 0–1 fraction of page width
  y: number;      // 0–1 fraction of page height
  width: number;
  height: number;
}

export interface Annotation {
  id: string;
  document_id: string;
  page_number: number;
  selection_txt: string;
  coordinates: Coordinates;
  note_content: string | null;
  font_style: FontStyle;
  font_size: FontSize;
  deep_link: string;   // researchhub:// URI
  created_at: string;
}

export interface Citation {
  document_title: string;
  page_number: number;
  doc_id: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
}

export interface PendingSelection {
  page_number: number;
  selection_txt: string;
  coordinates: Coordinates;
}

// ── Canvas drawing marks ──────────────────────────────────────────────────────

export type MarkType = 'pen' | 'arrow' | 'text' | 'highlight';
export type DrawTool = 'select' | 'pen' | 'arrow' | 'text' | 'highlight' | 'move' | 'eraser';

export interface MarkStyle {
  color: string;
  strokeWidth: number;
}

export interface PenData {
  points: Array<{ x: number; y: number }>;
}

export interface ArrowData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  points?: Array<{ x: number; y: number }>; // freehand path; if present, render as curve
}

export interface HighlightData {
  x1: number; // 0–1 fraction of page width/height
  y1: number;
  x2: number;
  y2: number;
}

export interface TextData {
  x: number;
  y: number;
  content: string;
  fontStyle: FontStyle;
  width?: number;   // 0–1 fraction of page width
  height?: number;  // 0–1 fraction of page height
}

export interface CanvasMark {
  id: string;
  document_id: string;
  page_number: number;
  mark_type: MarkType;
  data: PenData | ArrowData | TextData | HighlightData;
  style: MarkStyle;
  created_at: string;
}
