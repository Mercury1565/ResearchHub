import { create } from 'zustand';
import type { DrawTool, FontStyle } from '../types';

interface UndoEntry {
  markId: string;
  documentId: string;
}

interface WorkspaceState {
  activeProjectId: string | null;
  activeDocumentId: string | null;
  activePage: number;
  zoom: number;

  // Drawing tool state
  activeTool: DrawTool;
  lastDrawTool: DrawTool;  // remembered when toggling back to draw mode
  drawColor: string;
  highlightColor: string;  // separate color for the highlight tool
  strokeWidth: number;
  textFontStyle: FontStyle;
  textFontSizePt: number;  // font size for text marks (CSS px at zoom=1)

  // Undo stack (created marks only — undo = delete)
  undoStack: UndoEntry[];

  setActiveProject: (id: string | null) => void;
  setActiveDocument: (id: string | null) => void;
  setActivePage: (page: number) => void;
  setZoom: (z: number) => void;
  setActiveTool: (tool: DrawTool) => void;
  setDrawColor: (color: string) => void;
  setHighlightColor: (color: string) => void;
  setStrokeWidth: (w: number) => void;
  setTextFontStyle: (f: FontStyle) => void;
  setTextFontSizePt: (size: number) => void;
  pushUndo: (entry: UndoEntry) => void;
  popUndo: () => UndoEntry | undefined;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  activeProjectId:  null,
  activeDocumentId: null,
  activePage:       1,
  zoom:             1.5,

  activeTool:      'select',
  lastDrawTool:    'pen',
  drawColor:       '#2383E2',
  highlightColor:  '#FFD600',
  strokeWidth:     1.5,
  textFontStyle:   'caveat',
  textFontSizePt:  12,
  undoStack:       [],

  setActiveProject:  (id) => set({ activeProjectId: id }),
  setActiveDocument: (id) => set({ activeDocumentId: id, activePage: 1, undoStack: [] }),
  setActivePage:     (page) => set({ activePage: page }),
  setZoom:           (zoom) => set({ zoom }),

  setActiveTool: (tool) => set((s) => ({
    activeTool:   tool,
    lastDrawTool: tool !== 'select' ? tool : s.lastDrawTool,
  })),
  setDrawColor:      (color) => set({ drawColor: color }),
  setHighlightColor: (color) => set({ highlightColor: color }),
  setStrokeWidth:    (w) => set({ strokeWidth: w }),
  setTextFontStyle:  (f) => set({ textFontStyle: f }),
  setTextFontSizePt: (size) => set({ textFontSizePt: size }),

  pushUndo: (entry) => set((s) => ({
    undoStack: [...s.undoStack.slice(-19), entry],
  })),
  popUndo: () => {
    const stack = get().undoStack;
    if (stack.length === 0) return undefined;
    const entry = stack[stack.length - 1];
    set({ undoStack: stack.slice(0, -1) });
    return entry;
  },
}));
