import { useEffect, useRef, useState, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { TextLayer } from 'pdfjs-dist';
import { loadPDF } from '../../utils/pdfUtils';
import { useDocumentFileUrl } from '../../api/documents';
import { useWorkspaceStore } from '../../store/workspace';
import { usePDFSelection } from '../../hooks/usePDFSelection';
import AnnotationLayer from './AnnotationLayer';
import DrawingLayer from './DrawingLayer';
import Spinner from '../ui/Spinner';

interface Props {
  documentId: string;
}

export default function PDFViewer({ documentId }: Props) {
  const { data: fileData } = useDocumentFileUrl(documentId);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const textLayerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const renderedPages = useRef<Set<number>>(new Set());
  const zoom = useWorkspaceStore((s) => s.zoom);
  const activePage = useWorkspaceStore((s) => s.activePage);

  usePDFSelection();

  useEffect(() => {
    if (!fileData?.url) return;
    let cancelled = false;
    setLoading(true);
    loadPDF(fileData.url).then((doc) => {
      if (cancelled) return;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [fileData?.url]);

  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc) return;
      const page = await pdfDoc.getPage(pageNum);
      const scale = window.devicePixelRatio * zoom;
      const viewport = page.getViewport({ scale });

      const canvas = canvasRefs.current.get(pageNum);
      if (!canvas) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / window.devicePixelRatio}px`;
      canvas.style.height = `${viewport.height / window.devicePixelRatio}px`;

      await page.render({
        canvasContext: canvas.getContext('2d')!,
        viewport,
      }).promise;

      const textDiv = textLayerRefs.current.get(pageNum);
      if (textDiv) {
        textDiv.innerHTML = '';
        const displayViewport = page.getViewport({ scale: zoom });
        textDiv.style.width = `${displayViewport.width}px`;
        textDiv.style.height = `${displayViewport.height}px`;
        const textContent = await page.getTextContent();
        const textLayer = new TextLayer({
          textContentSource: textContent,
          container: textDiv,
          viewport: displayViewport,
        });
        await textLayer.render();
      }
    },
    [pdfDoc, zoom]
  );

  useEffect(() => {
    if (!pdfDoc) return;
    renderedPages.current.clear();
    const pagesToRender = Math.min(numPages, 5);
    for (let i = 1; i <= pagesToRender; i++) {
      renderedPages.current.add(i);
      renderPage(i);
    }
  }, [pdfDoc, zoom, renderPage, numPages]);

  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const pageNum = Number((entry.target as HTMLElement).dataset.page);
          if (!renderedPages.current.has(pageNum)) {
            renderedPages.current.add(pageNum);
            renderPage(pageNum);
          }
        }
      },
      { root: containerRef.current, rootMargin: '200px' }
    );

    const container = containerRef.current;
    container.querySelectorAll<HTMLElement>('[data-page]').forEach((el) => {
      const num = Number(el.dataset.page);
      if (num > 5) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [pdfDoc, numPages, renderPage]);

  useEffect(() => {
    const el = containerRef.current?.querySelector(`[data-page="${activePage}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [activePage]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto bg-[#F7F7F5] p-4">
      {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
        <div
          key={pageNum}
          data-page={pageNum}
          className="relative mx-auto mb-4 bg-white shadow-sm"
          style={{ width: 'fit-content' }}
        >
          <canvas
            ref={(el) => {
              if (el) canvasRefs.current.set(pageNum, el);
            }}
          />
          <div
            ref={(el) => {
              if (el) textLayerRefs.current.set(pageNum, el);
            }}
            className="textLayer absolute top-0 left-0"
          />
          <AnnotationLayer
            documentId={documentId}
            pageNumber={pageNum}
          />
          <DrawingLayer
            documentId={documentId}
            pageNumber={pageNum}
          />
        </div>
      ))}
    </div>
  );
}
