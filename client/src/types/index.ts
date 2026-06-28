// src/types/index.ts — Canonical types for ResearchHub frontend

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

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
  width?: number;    // 0–1 fraction of page width
  height?: number;   // 0–1 fraction of page height
  fontSize?: number; // 0–1 fraction of page height — scales with zoom
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
