import { useRef, useState, useEffect } from 'react';
import { useAnnotations } from '../../api/annotations';
import HighlightRect from './HighlightRect';
import { useWorkspaceStore } from '../../store/workspace';

interface Props {
  documentId: string;
  pageNumber: number;
}

export default function AnnotationLayer({ documentId, pageNumber }: Props) {
  const { data: annotations } = useAnnotations(documentId);
  const activeAnnotationId = useWorkspaceStore((s) => s.activeAnnotationId);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const pageAnnotations = annotations?.filter((a) => a.page_number === pageNumber) ?? [];
  if (pageAnnotations.length === 0 && size.w === 0) {
    return <div ref={containerRef} className="absolute inset-0" />;
  }

  return (
    <div ref={containerRef} className="absolute inset-0" style={{ zIndex: 2 }}>
      {size.w > 0 && pageAnnotations.length > 0 && (
        <svg
          className="pointer-events-none"
          width={size.w}
          height={size.h}
        >
          {pageAnnotations.map((ann) => (
            <HighlightRect
              key={ann.id}
              annotation={ann}
              canvasWidth={size.w}
              canvasHeight={size.h}
              isActive={ann.id === activeAnnotationId}
            />
          ))}
        </svg>
      )}
    </div>
  );
}
