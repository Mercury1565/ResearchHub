import { useEffect } from 'react';
import { useWorkspaceStore } from '../store/workspace';
import type { Coordinates } from '../types';

export function usePDFSelection() {
  const setPendingSelection = useWorkspaceStore((s) => s.setPendingSelection);

  useEffect(() => {
    const handler = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) return;

      const range = selection.getRangeAt(0);
      const text = selection.toString().trim();
      if (!text) return;

      const pageContainer = findPageContainer(range.startContainer);
      if (!pageContainer) return;

      const pageNum = parseInt(pageContainer.dataset.page ?? '0', 10);
      if (!pageNum) return;

      const canvas = pageContainer.querySelector('canvas');
      if (!canvas) return;

      const canvasRect = canvas.getBoundingClientRect();
      const selectionRect = range.getBoundingClientRect();

      const coords: Coordinates = {
        x: (selectionRect.left - canvasRect.left) / canvasRect.width,
        y: (selectionRect.top - canvasRect.top) / canvasRect.height,
        width: selectionRect.width / canvasRect.width,
        height: selectionRect.height / canvasRect.height,
      };

      setPendingSelection({
        page_number: pageNum,
        selection_txt: text,
        coordinates: coords,
      });
    };

    document.addEventListener('mouseup', handler);
    return () => document.removeEventListener('mouseup', handler);
  }, [setPendingSelection]);
}

function findPageContainer(node: Node): HTMLElement | null {
  let current: Node | null = node;
  while (current) {
    if (current instanceof HTMLElement && current.dataset.page) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}
