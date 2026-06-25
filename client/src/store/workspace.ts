import { create } from 'zustand';
import type { PendingSelection } from '../types';

interface WorkspaceState {
  activeProjectId: string | null;
  activeDocumentId: string | null;
  activePage: number;
  activeAnnotationId: string | null;
  pendingSelection: PendingSelection | null;
  zoom: number;

  setActiveProject: (id: string | null) => void;
  setActiveDocument: (id: string | null) => void;
  setActivePage: (page: number) => void;
  setActiveAnnotation: (id: string | null) => void;
  setPendingSelection: (sel: PendingSelection | null) => void;
  setZoom: (z: number) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeProjectId:   null,
  activeDocumentId:  null,
  activePage:        1,
  activeAnnotationId: null,
  pendingSelection:  null,
  zoom:              1.0,

  setActiveProject:   (id) => set({ activeProjectId: id }),
  setActiveDocument:  (id) => set({ activeDocumentId: id, activePage: 1 }),
  setActivePage:      (page) => set({ activePage: page }),
  setActiveAnnotation:(id) => set({ activeAnnotationId: id }),
  setPendingSelection:(sel) => set({ pendingSelection: sel }),
  setZoom:            (zoom) => set({ zoom }),
}));
