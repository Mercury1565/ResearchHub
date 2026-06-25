---
name: react-vite-frontend
description: >
  ResearchHub React + Vite frontend development skill. Use this skill whenever
  working on the ResearchHub frontend — including building components, implementing
  the PDF viewer, annotation layer, sticky notes, the AI chat panel, cross-document
  deep links, or state management. Trigger this skill any time the user mentions
  "frontend", "React", "Vite", "component", "PDF viewer", "annotation", "sticky note",
  "highlight", "chat panel", "sidebar", or references any file under the frontend/ directory.
---

# ResearchHub — React + Vite Frontend Skill

## Project Stack

| Layer          | Technology                                                  |
|----------------|-------------------------------------------------------------|
| Framework      | React 18 + Vite 5                                           |
| Language       | TypeScript (strict mode)                                    |
| Routing        | React Router v6                                             |
| State          | Zustand (global) + React Query (server state)               |
| PDF Rendering  | `pdfjs-dist` + canvas-based annotation overlay              |
| Styling        | Tailwind CSS v3                                             |
| Fonts          | Google Fonts: Caveat, Indie Flower, Patrick Hand, Inter     |
| HTTP Client    | `ky` (fetch wrapper)                                        |
| SSE / Streaming| native `EventSource` / `fetch` with `ReadableStream`        |
| Testing        | Vitest + React Testing Library                              |

---

## Project Layout

```
frontend/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── src/
│   ├── main.tsx              # React root, router setup
│   ├── App.tsx
│   ├── api/
│   │   ├── client.ts         # ky instance with base URL + auth
│   │   ├── projects.ts       # project CRUD hooks (React Query)
│   │   ├── documents.ts      # document upload + fetch hooks
│   │   ├── annotations.ts    # annotation CRUD hooks
│   │   └── chat.ts           # SSE streaming chat hook
│   ├── store/
│   │   ├── workspace.ts      # Zustand: active project/doc/page
│   │   └── annotations.ts    # Zustand: local annotation state
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Workspace.tsx        # Root split-screen layout
│   │   │   ├── Sidebar.tsx          # Project + document nav
│   │   │   ├── ViewerPanel.tsx      # Left panel (PDF viewer)
│   │   │   └── NotesPanel.tsx       # Right panel (notes + chat)
│   │   ├── pdf/
│   │   │   ├── PDFViewer.tsx        # pdfjs-dist canvas renderer
│   │   │   ├── AnnotationLayer.tsx  # SVG overlay for highlights
│   │   │   ├── HighlightRect.tsx    # Individual highlight rect
│   │   │   └── usePDFSelection.ts   # Hook: text selection → coords
│   │   ├── annotations/
│   │   │   ├── StickyNote.tsx       # Note card component
│   │   │   ├── StickyNoteEditor.tsx # Font/size controls + textarea
│   │   │   ├── FontPicker.tsx       # Font style selector (4 fonts)
│   │   │   └── DeepLink.tsx         # Renders researchhub:// as link
│   │   ├── chat/
│   │   │   ├── ChatPanel.tsx        # Chat container
│   │   │   ├── ChatMessage.tsx      # Message bubble w/ citations
│   │   │   └── CitationBadge.tsx    # Source + page ref badge
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       └── Spinner.tsx
│   ├── hooks/
│   │   ├── useDeepLink.ts    # Parse + navigate researchhub:// URIs
│   │   └── useStreamChat.ts  # SSE chat streaming
│   ├── types/
│   │   └── index.ts          # Shared TypeScript types
│   └── utils/
│       ├── pdfUtils.ts       # pdfjs helpers (getPageViewport, etc.)
│       └── coordUtils.ts     # Page coord ↔ DOM rect conversion
└── public/
    └── pdf.worker.min.mjs    # pdfjs worker (copied from pdfjs-dist)
```

---

## Core TypeScript Types

Always import from `src/types/index.ts` — never inline types in components.

```typescript
// src/types/index.ts

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

export interface Annotation {
  id: string;
  document_id: string;
  page_number: number;
  selection_txt: string;
  coordinates: { x: number; y: number; width: number; height: number };
  note_content: string | null;
  font_style: FontStyle;
  font_size: FontSize;
  deep_link: string;           // researchhub:// URI from backend
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
}

export interface Citation {
  document_title: string;
  page_number: number;
  doc_id: string;
}
```

---

## Layout Architecture (FR-A1, NFR Responsive Workspace)

The core workspace is a **CSS Grid split-screen** optimized for ≥ 1280 px wide viewports.

```tsx
// components/layout/Workspace.tsx
// Grid: [sidebar 260px] [viewer 1fr] [notes+chat 380px]
<div className="grid h-screen" style={{ gridTemplateColumns: '260px 1fr 380px' }}>
  <Sidebar />
  <ViewerPanel />
  <NotesPanel />
</div>
```

- Below 1280 px: collapse sidebar to icon rail; stack viewer and notes vertically.
- The split ratio is user-adjustable via a drag handle (use `react-resizable-panels`).

---

## PDF Viewer (FR-A1, FR-A2)

Key implementation points for `PDFViewer.tsx`:

```typescript
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// Render one page to a <canvas> at device pixel ratio for sharpness
const scale = window.devicePixelRatio * zoom;
const viewport = page.getViewport({ scale });
canvas.width  = viewport.width;
canvas.height = viewport.height;
await page.render({ canvasContext: ctx, viewport }).promise;
```

- Render **first 5 pages eagerly** to meet the < 1.5 s first-render target (NFR 4.1).
- Remaining pages render lazily as the user scrolls (Intersection Observer).
- Place `<AnnotationLayer />` as an `<svg>` absolutely positioned over each canvas — same width/height as the canvas.

---

## Annotation & Highlight Layer (FR-A2, FR-A3, FR-A4)

### Text Selection → Coordinates

```typescript
// hooks/usePDFSelection.ts
// 1. Listen to document 'mouseup'
// 2. Check window.getSelection() — bail if empty or outside viewer
// 3. Convert DOMRect (from getBoundingClientRect) to PDF page coordinates
//    by subtracting canvas.getBoundingClientRect() and dividing by (scale)
// 4. Dispatch to store → shows StickyNoteEditor
```

Coordinates stored as a fraction of page width/height (0–1 range) so they survive zoom changes.

### Highlight Rendering

```tsx
// components/pdf/HighlightRect.tsx
<rect
  x={coords.x * canvasWidth}
  y={coords.y * canvasHeight}
  width={coords.width * canvasWidth}
  height={coords.height * canvasHeight}
  fill="rgba(250, 204, 21, 0.35)"
  className="cursor-pointer hover:fill-yellow-300/50"
  onClick={() => setActiveAnnotation(annotation.id)}
/>
```

---

## Sticky Notes (FR-A3, FR-A4)

### Font Configuration

```typescript
// constants/fonts.ts
export const FONT_OPTIONS: { label: string; value: FontStyle; css: string }[] = [
  { label: 'Sans-serif',    value: 'sans-serif',   css: 'font-sans' },
  { label: 'Caveat',        value: 'caveat',        css: 'font-caveat' },
  { label: 'Indie Flower',  value: 'indie-flower',  css: 'font-indie' },
  { label: 'Patrick Hand',  value: 'patrick-hand',  css: 'font-patrick' },
];

export const SIZE_MAP: Record<FontSize, string> = {
  small:  'text-xs',
  medium: 'text-sm',
  large:  'text-base',
};
```

Add custom fonts to `tailwind.config.ts`:
```javascript
fontFamily: {
  caveat:   ['"Caveat"', 'cursive'],
  indie:    ['"Indie Flower"', 'cursive'],
  patrick:  ['"Patrick Hand"', 'cursive'],
}
```
Load all four via `<link>` in `index.html` from `fonts.googleapis.com`.

### StickyNote Component Anatomy

```
┌────────────────────────────────────────┐
│ 📎 "selected text excerpt…"  [🔗 Copy] │  ← header bar
├────────────────────────────────────────┤
│  [textarea — font applied here]        │  ← editable note
├────────────────────────────────────────┤
│  Font: [Aa▾]  Size: [S] [M] [L]  [✕]  │  ← controls
└────────────────────────────────────────┘
```

---

## Cross-Document Deep Links (FR-X1 → FR-X4)

### Copy Link
Every sticky note shows a "Copy Link" button that writes `annotation.deep_link` to the clipboard.

### Render as Hyperlink (FR-X3)
When saving a note, scan `note_content` for `researchhub://` URIs and render them as `<DeepLink>` spans:

```tsx
// components/annotations/DeepLink.tsx
// Parse: researchhub://project/{pid}/doc/{did}?page={N}&highlight={aid}
// Render: <span className="text-blue-600 underline cursor-pointer" onClick={navigate}>
//           📎 {docTitle} p.{page}
//         </span>
```

### Navigate on Click (FR-X4)
```typescript
// hooks/useDeepLink.ts
function navigateDeepLink(uri: string) {
  const url = new URL(uri);              // use URL() — it handles custom schemes
  const docId = url.pathname.split('/doc/')[1];
  const page  = Number(url.searchParams.get('page'));
  const aid   = url.searchParams.get('highlight');
  // 1. Load document into ViewerPanel
  // 2. Scroll to page N
  // 3. Flash-highlight annotation aid
}
```

---

## AI Chat Panel (FR-C1 → FR-C3)

```typescript
// hooks/useStreamChat.ts
async function sendMessage(projectId: string, message: string) {
  const res = await fetch(`/api/projects/${projectId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  // Parse SSE: "data: {token}\n\n" → append to message buffer
  // Citations arrive as a final JSON event: "data: [CITATIONS]{...}\n\n"
}
```

Citations render as inline `<CitationBadge />` links — clicking navigates via `useDeepLink`.

---

## State Management

### Zustand workspace store

```typescript
// store/workspace.ts
interface WorkspaceState {
  activeProjectId: string | null;
  activeDocumentId: string | null;
  activePage: number;
  activeAnnotationId: string | null;
  zoom: number;
  setActiveDocument: (docId: string) => void;
  setActivePage: (page: number) => void;
  setZoom: (z: number) => void;
}
```

### React Query keys

```
['projects']
['documents', projectId]
['annotations', documentId]
['chat', projectId]
```

---

## Key Rules

1. Never fetch directly in components — always go through React Query hooks in `src/api/`.
2. Annotation coordinates are always stored as **0–1 fractions** relative to page size — convert to pixels only at render time.
3. PDF canvas must be redrawn when `zoom` changes — use a `useEffect` that depends on `[pdfPage, zoom, devicePixelRatio]`.
4. The annotation SVG layer must be pointer-events-none except on `<rect>` elements — prevents blocking text selection.
5. The `pdfjs-dist` worker path must always point to `/pdf.worker.min.mjs` (copied to `public/`) — never CDN in production.
6. Deep link navigation must not use `window.location` — route through Zustand + React Router to avoid full page reloads.
7. Font loading: add `font-display: swap` and preload the four Google Font families to prevent FOUT on sticky notes.
