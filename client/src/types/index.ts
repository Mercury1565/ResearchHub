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
