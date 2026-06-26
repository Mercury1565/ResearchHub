import { useState } from 'react';
import { useWorkspaceStore } from '../../store/workspace';
import PDFViewer from '../pdf/PDFViewer';
import DrawingToolbar from '../pdf/DrawingToolbar';
import Button from '../ui/Button';
import { useDocumentFileUrl } from '../../api/documents';
import { useCanvasMarks } from '../../api/canvasMarks';
import { downloadAnnotatedPDF } from '../../utils/downloadAnnotatedPDF';

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 2v7M4.5 6.5L7 9l2.5-2.5" />
      <path d="M2 11h10" />
    </svg>
  );
}

function DownloadButton({ documentId }: { documentId: string }) {
  const { data: fileData }  = useDocumentFileUrl(documentId);
  const { data: marks }     = useCanvasMarks(documentId);
  const [busy, setBusy]     = useState(false);

  const handleClick = async () => {
    if (!fileData?.url || busy) return;
    setBusy(true);
    try {
      await downloadAnnotatedPDF(fileData.url, marks ?? [], `${documentId}.pdf`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={busy || !fileData?.url}
      title="Download PDF with annotations"
      className={[
        'flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors duration-100',
        busy || !fileData?.url
          ? 'cursor-not-allowed text-[#C8C7C4]'
          : 'text-[#6B6B6B] hover:bg-[#EFEEEC] hover:text-[#1A1A1A]',
      ].join(' ')}
    >
      <DownloadIcon />
      {busy ? 'Preparing…' : 'Download'}
    </button>
  );
}

export default function ViewerPanel() {
  const activeDocumentId = useWorkspaceStore((s) => s.activeDocumentId);
  const zoom    = useWorkspaceStore((s) => s.zoom);
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
      {/* Zoom + Download controls */}
      <div className="flex items-center gap-2 border-b border-[#E3E2DF] px-4 py-1.5">
        <Button onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}>−</Button>
        <span className="text-xs text-[#6B6B6B] min-w-[3rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button onClick={() => setZoom(Math.min(3, zoom + 0.25))}>+</Button>
        <div className="ml-auto">
          <DownloadButton documentId={activeDocumentId} />
        </div>
      </div>
      {/* Drawing toolbar */}
      <DrawingToolbar />
      <div className="flex-1 overflow-hidden">
        <PDFViewer documentId={activeDocumentId} />
      </div>
    </div>
  );
}
