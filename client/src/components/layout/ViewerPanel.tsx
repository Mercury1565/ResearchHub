import { useWorkspaceStore } from '../../store/workspace';
import PDFViewer from '../pdf/PDFViewer';
import Button from '../ui/Button';

export default function ViewerPanel() {
  const activeDocumentId = useWorkspaceStore((s) => s.activeDocumentId);
  const zoom = useWorkspaceStore((s) => s.zoom);
  const setZoom = useWorkspaceStore((s) => s.setZoom);

  if (!activeDocumentId) {
    return (
      <div className="flex h-full items-center justify-center bg-[#F7F7F5]">
        <p className="text-sm text-[#6B6B6B]">Select a document to open the viewer</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#F7F7F5]">
      <div className="flex items-center gap-2 border-b border-[#E3E2DF] px-4 py-1.5">
        <Button onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}>−</Button>
        <span className="text-xs text-[#6B6B6B] min-w-[3rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button onClick={() => setZoom(Math.min(3, zoom + 0.25))}>+</Button>
      </div>
      <div className="flex-1 overflow-hidden">
        <PDFViewer documentId={activeDocumentId} />
      </div>
    </div>
  );
}
