import type { Annotation } from '../../types';
import { fractionalToPixels } from '../../utils/coordUtils';
import { useWorkspaceStore } from '../../store/workspace';
import { useAnnotationStore } from '../../store/annotations';

interface Props {
  annotation: Annotation;
  canvasWidth: number;
  canvasHeight: number;
  isActive: boolean;
}

export default function HighlightRect({ annotation, canvasWidth, canvasHeight, isActive }: Props) {
  const setActiveAnnotation = useWorkspaceStore((s) => s.setActiveAnnotation);
  const flashingId = useAnnotationStore((s) => s.flashingAnnotationId);
  const isFlashing = flashingId === annotation.id;

  const { x, y, width, height } = fractionalToPixels(
    annotation.coordinates,
    canvasWidth,
    canvasHeight
  );

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={isActive || isFlashing ? 'rgba(255, 212, 0, 0.55)' : 'rgba(255, 212, 0, 0.30)'}
      className="pointer-events-auto cursor-pointer transition-colors duration-100"
      style={isFlashing ? { animation: 'highlight-pulse 0.75s ease-in-out 2' } : undefined}
      onClick={() => setActiveAnnotation(annotation.id)}
    />
  );
}
