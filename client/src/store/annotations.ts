import { create } from 'zustand';

interface AnnotationUIState {
  editingAnnotationId: string | null;
  flashingAnnotationId: string | null;
  setEditingAnnotation: (id: string | null) => void;
  flashAnnotation: (id: string) => void;
}

export const useAnnotationStore = create<AnnotationUIState>((set) => ({
  editingAnnotationId: null,
  flashingAnnotationId: null,

  setEditingAnnotation: (id) => set({ editingAnnotationId: id }),

  flashAnnotation: (id) => {
    set({ flashingAnnotationId: id });
    setTimeout(() => set({ flashingAnnotationId: null }), 1500);
  },
}));
