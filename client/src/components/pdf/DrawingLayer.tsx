import { useRef, useState, useEffect, useCallback } from 'react';
import {
  useCanvasMarks, useCreateCanvasMark, useUpdateCanvasMark, useDeleteCanvasMark,
} from '../../api/canvasMarks';
import { useWorkspaceStore } from '../../store/workspace';
import type {
  CanvasMark, PenData, ArrowData, TextData, HighlightData, MarkStyle, FontStyle,
} from '../../types';

interface Props {
  documentId: string;
  pageNumber: number;
}

interface Pt { x: number; y: number }

const FONT_FAMILIES: Record<FontStyle, string> = {
  'sans-serif':   'Inter, ui-sans-serif, system-ui, sans-serif',
  'caveat':       '"Caveat", cursive',
  'indie-flower': '"Indie Flower", cursive',
  'patrick-hand': '"Patrick Hand", cursive',
};

const ERASER_PX: Record<number, number> = { 1.5: 18, 2.5: 30, 4: 46 };

// ── Geometry helpers ──────────────────────────────────────────────────────────

function pointsToPath(pts: Pt[], w: number, h: number): string {
  if (pts.length < 2) return '';
  const px = pts.map(p => ({ x: p.x * w, y: p.y * h }));
  let d = `M ${px[0].x} ${px[0].y}`;
  for (let i = 1; i < px.length - 1; i++) {
    const mx = (px[i].x + px[i + 1].x) / 2;
    const my = (px[i].y + px[i + 1].y) / 2;
    d += ` Q ${px[i].x} ${px[i].y} ${mx} ${my}`;
  }
  d += ` L ${px[px.length - 1].x} ${px[px.length - 1].y}`;
  return d;
}

function applyOffset(mark: CanvasMark, dx: number, dy: number): CanvasMark {
  if (mark.mark_type === 'pen') {
    const d = mark.data as PenData;
    return { ...mark, data: { points: d.points.map(p => ({ x: p.x + dx, y: p.y + dy })) } };
  }
  if (mark.mark_type === 'arrow') {
    const d = mark.data as ArrowData;
    const pts = d.points?.map(p => ({ x: p.x + dx, y: p.y + dy }));
    return { ...mark, data: { x1: d.x1 + dx, y1: d.y1 + dy, x2: d.x2 + dx, y2: d.y2 + dy, points: pts } };
  }
  if (mark.mark_type === 'text') {
    const d = mark.data as TextData;
    return { ...mark, data: { ...d, x: d.x + dx, y: d.y + dy } };
  }
  if (mark.mark_type === 'highlight') {
    const d = mark.data as HighlightData;
    return { ...mark, data: { x1: d.x1+dx, y1: d.y1+dy, x2: d.x2+dx, y2: d.y2+dy } };
  }
  return mark;
}

function segmentHitsBox(
  x1: number, y1: number, x2: number, y2: number,
  bx1: number, by1: number, bx2: number, by2: number,
): boolean {
  const inBox = (x: number, y: number) => x >= bx1 && x <= bx2 && y >= by1 && y <= by2;
  if (inBox(x1, y1) || inBox(x2, y2)) return true;
  const dx = x2 - x1, dy = y2 - y1;
  let t0 = 0, t1 = 1;
  const clip = (p: number, q: number): boolean => {
    if (Math.abs(p) < 1e-12) return q >= 0;
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
    else        { if (r < t0) return false; if (r < t1) t1 = r; }
    return true;
  };
  return clip(-dx, x1 - bx1) && clip(dx, bx2 - x1) &&
         clip(-dy, y1 - by1) && clip(dy, by2 - y1);
}

function markIntersectsEraser(
  mark: CanvasMark, cx: number, cy: number, hw: number, hh: number,
): boolean {
  const bx1 = cx - hw, bx2 = cx + hw;
  const by1 = cy - hh, by2 = cy + hh;
  const inBox = (p: Pt) => p.x >= bx1 && p.x <= bx2 && p.y >= by1 && p.y <= by2;

  if (mark.mark_type === 'pen') {
    const pts = (mark.data as PenData).points;
    for (let i = 0; i < pts.length; i++) {
      if (inBox(pts[i])) return true;
      if (i > 0 && segmentHitsBox(pts[i-1].x, pts[i-1].y, pts[i].x, pts[i].y, bx1, by1, bx2, by2))
        return true;
    }
    return false;
  }
  if (mark.mark_type === 'arrow') {
    const d   = mark.data as ArrowData;
    const pts = d.points ?? [{ x: d.x1, y: d.y1 }, { x: d.x2, y: d.y2 }];
    for (let i = 0; i < pts.length; i++) {
      if (inBox(pts[i])) return true;
      if (i > 0 && segmentHitsBox(pts[i-1].x, pts[i-1].y, pts[i].x, pts[i].y, bx1, by1, bx2, by2))
        return true;
    }
    return false;
  }
  if (mark.mark_type === 'text') {
    const d = mark.data as TextData;
    return inBox({ x: d.x, y: d.y });
  }
  if (mark.mark_type === 'highlight') {
    const d = mark.data as HighlightData;
    const hx1 = Math.min(d.x1, d.x2), hx2 = Math.max(d.x1, d.x2);
    const hy1 = Math.min(d.y1, d.y2), hy2 = Math.max(d.y1, d.y2);
    return !(hx2 < bx1 || hx1 > bx2 || hy2 < by1 || hy1 > by2);
  }
  return false;
}

// ── SVG mark renderer ─────────────────────────────────────────────────────────

interface MarkProps {
  mark: CanvasMark; w: number; h: number;
  isMoveMode: boolean; dragOffset?: Pt;
  onMoveStart: (e: React.PointerEvent, mark: CanvasMark) => void;
}

function ArrowMarker({ id, color }: { id: string; color: string }) {
  return (
    <marker id={id} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill={color} />
    </marker>
  );
}

function RenderedMark({ mark, w, h, isMoveMode, dragOffset, onMoveStart }: MarkProps) {
  const resolved = dragOffset ? applyOffset(mark, dragOffset.x, dragOffset.y) : mark;
  const { color, strokeWidth } = mark.style as MarkStyle;
  const mid = `ah-${mark.id}`;

  if (mark.mark_type === 'pen') {
    const pathD = pointsToPath((resolved.data as PenData).points, w, h);
    return (
      <g>
        <path d={pathD} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeLinejoin="round" style={{ pointerEvents: 'none' }} />
        {isMoveMode && (
          <path d={pathD} fill="none" stroke="#000" strokeWidth={20}
            strokeLinecap="round" strokeLinejoin="round"
            style={{ opacity: 0, pointerEvents: 'stroke', cursor: 'grab' }}
            onPointerDown={e => onMoveStart(e, mark)} />
        )}
      </g>
    );
  }

  if (mark.mark_type === 'arrow') {
    const d = resolved.data as ArrowData;

    if (d.points && d.points.length >= 2) {
      // Freehand arrow — bezier path with arrowhead
      const pathD = pointsToPath(d.points, w, h);
      return (
        <g>
          <defs><ArrowMarker id={mid} color={color} /></defs>
          <path d={pathD} fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeLinecap="round" strokeLinejoin="round" markerEnd={`url(#${mid})`}
            style={{ pointerEvents: 'none' }} />
          {isMoveMode && (
            <path d={pathD} fill="none" stroke="#000" strokeWidth={20}
              strokeLinecap="round" strokeLinejoin="round"
              style={{ opacity: 0, pointerEvents: 'stroke', cursor: 'grab' }}
              onPointerDown={e => onMoveStart(e, mark)} />
          )}
        </g>
      );
    }

    // Legacy straight arrow
    const x1 = d.x1 * w, y1 = d.y1 * h, x2 = d.x2 * w, y2 = d.y2 * h;
    return (
      <g>
        <defs><ArrowMarker id={mid} color={color} /></defs>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={strokeWidth}
          markerEnd={`url(#${mid})`} style={{ pointerEvents: 'none' }} />
        {isMoveMode && (
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#000" strokeWidth={20}
            style={{ opacity: 0, pointerEvents: 'stroke', cursor: 'grab' }}
            onPointerDown={e => onMoveStart(e, mark)} />
        )}
      </g>
    );
  }

  if (mark.mark_type === 'highlight') {
    const d  = resolved.data as HighlightData;
    const rx = Math.min(d.x1, d.x2) * w;
    const ry = Math.min(d.y1, d.y2) * h;
    const rw = Math.abs(d.x2 - d.x1) * w;
    const rh = Math.abs(d.y2 - d.y1) * h;
    return (
      <g>
        <rect x={rx} y={ry} width={rw} height={rh}
          fill={color} fillOpacity={0.32} rx={1}
          style={{ pointerEvents: 'none' }} />
        {isMoveMode && (
          <rect x={rx} y={ry} width={rw} height={rh}
            fillOpacity={0} style={{ pointerEvents: 'all', cursor: 'grab' }}
            onPointerDown={e => onMoveStart(e, mark)} />
        )}
      </g>
    );
  }

  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DrawingLayer({ documentId, pageNumber }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef     = useRef<SVGSVGElement>(null);
  const newTextRef = useRef<HTMLTextAreaElement>(null);
  const editRef    = useRef<HTMLTextAreaElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const activeTool     = useWorkspaceStore(s => s.activeTool);
  const drawColor      = useWorkspaceStore(s => s.drawColor);
  const highlightColor = useWorkspaceStore(s => s.highlightColor);
  const strokeWidth    = useWorkspaceStore(s => s.strokeWidth);
  const textFontStyle = useWorkspaceStore(s => s.textFontStyle);
  const pushUndo      = useWorkspaceStore(s => s.pushUndo);

  const { data: marks } = useCanvasMarks(documentId);
  const createMark  = useCreateCanvasMark();
  const updateMark  = useUpdateCanvasMark();
  const deleteMark  = useDeleteCanvasMark();

  // Drawing — pen and freehand arrow share livePoints
  const [livePoints,    setLivePoints]    = useState<Pt[] | null>(null);
  const [liveHighlight, setLiveHighlight] = useState<HighlightData | null>(null);
  const [pendingText, setPendingText] = useState<{ fx: number; fy: number; pxX: number; pxY: number } | null>(null);
  const [textInput,   setTextInput]   = useState('');

  // Text editing (click in text/move mode → resizable textarea)
  const [editingMarkId, setEditingMarkId] = useState<string | null>(null);
  const [editContent,   setEditContent]   = useState('');

  // Move drag
  const [dragging, setDragging] = useState<{
    mark: CanvasMark; startFrac: Pt; offset: Pt;
  } | null>(null);

  // Text box resize (corner handle drag)
  const [resizing, setResizing] = useState<{
    markId: string;
    startX: number; startY: number;
    initW: number;  initH: number;
    curW: number;   curH: number;
  } | null>(null);

  // Eraser
  const [eraserPos, setEraserPos] = useState<Pt | null>(null);
  const [isErasing, setIsErasing] = useState(false);
  const deletedInStroke = useRef<Set<string>>(new Set());
  const marksRef        = useRef<CanvasMark[]>([]);

  const isDrawMode    = activeTool !== 'select';
  const isEraser      = activeTool === 'eraser';
  const isMove        = activeTool === 'move';
  const isTextTool    = activeTool === 'text';

  const pageMarks = marks?.filter(m => m.page_number === pageNumber) ?? [];
  const svgMarks  = pageMarks.filter(m => m.mark_type !== 'text');
  const textMarks = pageMarks.filter(m => m.mark_type === 'text');

  useEffect(() => { marksRef.current = pageMarks; });

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setDims({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (pendingText) newTextRef.current?.focus();
  }, [pendingText]);

  useEffect(() => {
    if (editingMarkId) {
      const el = editRef.current;
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }
  }, [editingMarkId]);

  useEffect(() => {
    if (!isDrawMode) setEditingMarkId(null);
  }, [isDrawMode]);

  useEffect(() => {
    if (!isEraser) { setEraserPos(null); setIsErasing(false); }
  }, [isEraser]);

  const toFrac = useCallback((clientX: number, clientY: number): Pt => {
    const rect = wrapperRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top)  / rect.height)),
    };
  }, []);

  // ── Erase brush ──────────────────────────────────────────────────────────────

  const eraserSizePx = ERASER_PX[strokeWidth] ?? 30;

  const eraseAt = useCallback((center: Pt) => {
    if (!dims.w || !dims.h) return;
    const hw = (eraserSizePx / 2) / dims.w;
    const hh = (eraserSizePx / 2) / dims.h;
    marksRef.current.forEach(m => {
      if (deletedInStroke.current.has(m.id)) return;
      if (markIntersectsEraser(m, center.x, center.y, hw, hh)) {
        deletedInStroke.current.add(m.id);
        deleteMark.mutate({ id: m.id, documentId });
      }
    });
  }, [dims, eraserSizePx, deleteMark, documentId]);

  // ── Move drag ────────────────────────────────────────────────────────────────

  const startDrag = useCallback((e: React.PointerEvent, mark: CanvasMark) => {
    e.stopPropagation();
    wrapperRef.current?.setPointerCapture(e.pointerId);
    setDragging({ mark, startFrac: toFrac(e.clientX, e.clientY), offset: { x: 0, y: 0 } });
  }, [toFrac]);

  // ── Text editing ─────────────────────────────────────────────────────────────

  const startEditing = useCallback((m: CanvasMark) => {
    setEditingMarkId(m.id);
    setEditContent((m.data as TextData).content);
  }, []);

  const commitEdit = useCallback((el: HTMLTextAreaElement) => {
    if (!editingMarkId || !dims.w || !dims.h) return;
    const mark = marks?.find(m => m.id === editingMarkId);
    setEditingMarkId(null);
    if (!mark) return;

    const raw        = mark.data as TextData;
    const newContent = editContent.trim();
    const newW = el.offsetWidth  / dims.w;
    const newH = el.offsetHeight / dims.h;

    if (!newContent) {
      deleteMark.mutate({ id: mark.id, documentId });
      return;
    }
    if (newContent !== raw.content ||
        Math.abs(newW - (raw.width  ?? 0)) > 0.005 ||
        Math.abs(newH - (raw.height ?? 0)) > 0.005) {
      updateMark.mutate({
        id: mark.id, documentId,
        data:  { ...raw, content: newContent, width: newW, height: newH } as TextData,
        style: mark.style as MarkStyle,
      });
    }
  }, [editingMarkId, editContent, dims, marks, documentId, updateMark, deleteMark]);

  // ── SVG handlers — pen + freehand arrow share livePoints ─────────────────────

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (activeTool === 'pen' || activeTool === 'arrow') {
      e.currentTarget.setPointerCapture(e.pointerId);
      setLivePoints([toFrac(e.clientX, e.clientY)]);
    } else if (activeTool === 'highlight') {
      e.currentTarget.setPointerCapture(e.pointerId);
      const pt = toFrac(e.clientX, e.clientY);
      setLiveHighlight({ x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y });
    }
  };

  const MIN_DIST_SQ = 0.0001;

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if ((activeTool === 'pen' || activeTool === 'arrow') && livePoints) {
      const pt = toFrac(e.clientX, e.clientY);
      setLivePoints(prev => {
        if (!prev) return [pt];
        const last = prev[prev.length - 1];
        const dx = pt.x - last.x, dy = pt.y - last.y;
        if (dx * dx + dy * dy < MIN_DIST_SQ) return prev;
        return [...prev, pt];
      });
    } else if (activeTool === 'highlight' && liveHighlight) {
      const pt = toFrac(e.clientX, e.clientY);
      setLiveHighlight(prev => prev ? { ...prev, x2: pt.x, y2: pt.y } : null);
    }
  };

  const handleSvgPointerUp = () => {
    if (activeTool === 'highlight' && liveHighlight) {
      const { x1, y1, x2, y2 } = liveHighlight;
      const minSize = 0.005;
      if (Math.abs(x2 - x1) > minSize && Math.abs(y2 - y1) > minSize) {
        createMark.mutate(
          { documentId, page_number: pageNumber, mark_type: 'highlight',
            data: { x1, y1, x2, y2 } as HighlightData, style: { color: highlightColor, strokeWidth } },
          { onSuccess: m => pushUndo({ markId: m.id, documentId }) }
        );
      }
      setLiveHighlight(null);
      return;
    }

    if (!livePoints || livePoints.length < 2) { setLivePoints(null); return; }

    if (activeTool === 'pen') {
      createMark.mutate(
        { documentId, page_number: pageNumber, mark_type: 'pen',
          data: { points: livePoints } as PenData, style: { color: drawColor, strokeWidth } },
        { onSuccess: m => pushUndo({ markId: m.id, documentId }) }
      );
    } else if (activeTool === 'arrow') {
      const first = livePoints[0];
      const last  = livePoints[livePoints.length - 1];
      createMark.mutate(
        { documentId, page_number: pageNumber, mark_type: 'arrow',
          data: { x1: first.x, y1: first.y, x2: last.x, y2: last.y, points: livePoints } as ArrowData,
          style: { color: drawColor, strokeWidth } },
        { onSuccess: m => pushUndo({ markId: m.id, documentId }) }
      );
    }
    setLivePoints(null);
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool !== 'text' || pendingText) return;
    const pt   = toFrac(e.clientX, e.clientY);
    const rect = wrapperRef.current!.getBoundingClientRect();
    setPendingText({ fx: pt.x, fy: pt.y, pxX: e.clientX - rect.left, pxY: e.clientY - rect.top });
    setTextInput('');
  };

  // ── Wrapper handlers — eraser + move + text resize ───────────────────────────

  const handleWrapperPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isEraser) {
      wrapperRef.current?.setPointerCapture(e.pointerId);
      setIsErasing(true);
      eraseAt(toFrac(e.clientX, e.clientY));
    }
  };

  const handleWrapperPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (resizing) {
      const dx = e.clientX - resizing.startX;
      const dy = e.clientY - resizing.startY;
      setResizing(prev => prev ? {
        ...prev,
        curW: Math.max(80,  prev.initW + dx),
        curH: Math.max(36, prev.initH + dy),
      } : null);
    } else if (isEraser) {
      const pt = toFrac(e.clientX, e.clientY);
      setEraserPos(pt);
      if (isErasing) eraseAt(pt);
    } else if (isMove && dragging) {
      const current = toFrac(e.clientX, e.clientY);
      setDragging(prev => prev
        ? { ...prev, offset: { x: current.x - prev.startFrac.x, y: current.y - prev.startFrac.y } }
        : null);
    }
  };

  const handleWrapperPointerUp = () => {
    if (resizing) {
      const mark = marks?.find(m => m.id === resizing.markId);
      if (mark && dims.w && dims.h) {
        const raw = mark.data as TextData;
        updateMark.mutate({
          id: mark.id, documentId,
          data:  { ...raw, width: resizing.curW / dims.w, height: resizing.curH / dims.h } as TextData,
          style: mark.style as MarkStyle,
        });
      }
      setResizing(null);
      return;
    }
    if (isEraser) {
      setIsErasing(false);
      deletedInStroke.current.clear();
    } else if (isMove && dragging) {
      if (Math.abs(dragging.offset.x) > 0.001 || Math.abs(dragging.offset.y) > 0.001) {
        const moved = applyOffset(dragging.mark, dragging.offset.x, dragging.offset.y);
        updateMark.mutate({
          id: dragging.mark.id, documentId,
          data:  moved.data as PenData | ArrowData | TextData,
          style: dragging.mark.style as MarkStyle,
        });
      }
      setDragging(null);
    }
  };

  const handleWrapperPointerLeave = () => {
    if (isEraser) { setEraserPos(null); setIsErasing(false); deletedInStroke.current.clear(); }
  };

  // ── New-text helpers ──────────────────────────────────────────────────────────

  const commitText = () => {
    if (!pendingText) return;
    const content = textInput.trim();
    if (content) {
      const el = newTextRef.current;
      const w  = el && dims.w ? el.offsetWidth  / dims.w : undefined;
      const h  = el && dims.h ? el.offsetHeight / dims.h : undefined;
      createMark.mutate(
        { documentId, page_number: pageNumber, mark_type: 'text',
          data: { x: pendingText.fx, y: pendingText.fy, content, fontStyle: textFontStyle, width: w, height: h } as TextData,
          style: { color: drawColor, strokeWidth } },
        { onSuccess: m => pushUndo({ markId: m.id, documentId }) }
      );
    }
    setPendingText(null);
    setTextInput('');
  };

  const cancelText = () => { setPendingText(null); setTextInput(''); };

  // ── Derived ───────────────────────────────────────────────────────────────────

  const eraserPxPos = eraserPos && dims.w > 0
    ? { left: eraserPos.x * dims.w, top: eraserPos.y * dims.h } : null;

  const svgCursor = isEraser ? 'none'
    : activeTool === 'pen' || activeTool === 'arrow' ? 'crosshair'
    : activeTool === 'highlight' ? 'crosshair'
    : activeTool === 'text' ? 'text'
    : activeTool === 'move' ? 'grab'
    : 'default';

  return (
    <div
      ref={wrapperRef}
      className="absolute inset-0"
      style={{ zIndex: 3, pointerEvents: isDrawMode ? 'all' : 'none', cursor: isEraser ? 'none' : undefined }}
      onPointerDown={handleWrapperPointerDown}
      onPointerMove={handleWrapperPointerMove}
      onPointerUp={handleWrapperPointerUp}
      onPointerLeave={handleWrapperPointerLeave}
    >
      {/* ── SVG layer ────────────────────────────────────────────────────── */}
      <svg
        ref={svgRef}
        width="100%" height="100%"
        style={{ display: 'block', cursor: svgCursor }}
        onPointerDown={handleSvgPointerDown}
        onPointerMove={handleSvgPointerMove}
        onPointerUp={handleSvgPointerUp}
        onClick={handleSvgClick}
      >
        {/* Live arrow marker (pen strokes don't need a marker) */}
        {activeTool === 'arrow' && livePoints && livePoints.length > 1 && (
          <defs>
            <marker id="ah-live" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={drawColor} />
            </marker>
          </defs>
        )}

        {dims.w > 0 && svgMarks.map(m => {
          const isDragged = dragging?.mark.id === m.id;
          return (
            <RenderedMark key={m.id} mark={m} w={dims.w} h={dims.h}
              isMoveMode={isMove} dragOffset={isDragged ? dragging!.offset : undefined}
              onMoveStart={startDrag} />
          );
        })}

        {/* Live pen / freehand-arrow preview */}
        {livePoints && livePoints.length > 1 && dims.w > 0 && (
          <path d={pointsToPath(livePoints, dims.w, dims.h)} fill="none"
            stroke={drawColor} strokeWidth={strokeWidth}
            strokeLinecap="round" strokeLinejoin="round"
            markerEnd={activeTool === 'arrow' ? 'url(#ah-live)' : undefined}
            style={{ pointerEvents: 'none' }} />
        )}

        {/* Live highlight preview */}
        {liveHighlight && dims.w > 0 && (
          <rect
            x={Math.min(liveHighlight.x1, liveHighlight.x2) * dims.w}
            y={Math.min(liveHighlight.y1, liveHighlight.y2) * dims.h}
            width={Math.abs(liveHighlight.x2 - liveHighlight.x1) * dims.w}
            height={Math.abs(liveHighlight.y2 - liveHighlight.y1) * dims.h}
            fill={highlightColor} fillOpacity={0.32} rx={1}
            style={{ pointerEvents: 'none' }}
          />
        )}
      </svg>

      {/* ── Text marks ───────────────────────────────────────────────────── */}
      {dims.w > 0 && textMarks.map(m => {
        const isDragged  = dragging?.mark.id === m.id;
        const isEditing  = editingMarkId === m.id;
        const isResizing = resizing?.markId === m.id;
        const raw        = m.data as TextData;
        const s          = m.style as MarkStyle;

        const posData = isDragged
          ? { x: raw.x + dragging!.offset.x, y: raw.y + dragging!.offset.y }
          : { x: raw.x, y: raw.y };

        // Base dimensions: stored (px) or sensible default for resize init
        const baseW = raw.width  ? raw.width  * dims.w : 180;
        const baseH = raw.height ? raw.height * dims.h : 40;

        // Display dimensions: live during resize, stored otherwise
        const displayW = isResizing ? resizing!.curW : (raw.width  ? raw.width  * dims.w : undefined);
        const displayH = isResizing ? resizing!.curH : (raw.height ? raw.height * dims.h : undefined);

        // Text marks can be interacted with in text-tool or move mode
        const canInteract = isTextTool || isMove;

        return (
          <div
            key={m.id}
            className="absolute"
            style={{
              left:      `${posData.x * 100}%`,
              top:       `${posData.y * 100}%`,
              transform: 'translateY(-50%)',
              zIndex:    isEditing ? 15 : undefined,
            }}
          >
            {isEditing ? (
              /* Editing: resizable textarea */
              <textarea
                ref={editRef}
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                onBlur={e => commitEdit(e.currentTarget)}
                onKeyDown={e => { if (e.key === 'Escape') setEditingMarkId(null); }}
                style={{
                  display:      'block',
                  width:        baseW,
                  height:       baseH,
                  minWidth:     80,
                  minHeight:    36,
                  resize:       'both',
                  overflow:     'auto',
                  fontFamily:   FONT_FAMILIES[raw.fontStyle ?? 'caveat'],
                  color:        s.color,
                  fontSize:     '1.1rem',
                  lineHeight:   1.4,
                  border:       '1.5px solid #2383E2',
                  borderRadius: 3,
                  padding:      '3px 5px',
                  background:   'rgba(255,255,255,0.92)',
                  outline:      'none',
                  boxShadow:    '0 1px 4px rgba(0,0,0,0.12)',
                }}
              />
            ) : (
              /* Display: interactive in text/move mode */
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <div
                  className="whitespace-pre-wrap leading-snug"
                  style={{
                    width:        displayW,
                    height:       displayH,
                    maxWidth:     displayW ? undefined : '40%',
                    overflow:     displayW || displayH ? 'hidden' : undefined,
                    color:        s.color,
                    fontFamily:   FONT_FAMILIES[raw.fontStyle ?? 'caveat'],
                    fontSize:     '1.1rem',
                    userSelect:   'none',
                    pointerEvents: canInteract ? 'all' : 'none',
                    cursor:       isMove
                      ? (isDragged ? 'grabbing' : 'grab')
                      : isTextTool ? 'text' : 'default',
                    outline:      (isTextTool || isResizing)
                      ? '1.5px dashed rgba(35,131,226,0.7)'
                      : undefined,
                    outlineOffset: '3px',
                    borderRadius:  (isTextTool || isResizing) ? '2px' : undefined,
                  }}
                  onClick={isTextTool ? () => startEditing(m) : undefined}
                  onPointerDown={isMove ? e => startDrag(e, m) : undefined}
                >
                  {raw.content}
                </div>

                {/* Corner resize handle — visible in text-tool and move mode */}
                {canInteract && (
                  <div
                    title="Drag to resize"
                    style={{
                      position:   'absolute',
                      bottom:     -5,
                      right:      -5,
                      width:      10,
                      height:     10,
                      background: '#2383E2',
                      border:     '1.5px solid white',
                      borderRadius: 1,
                      cursor:     'se-resize',
                      zIndex:     10,
                    }}
                    onPointerDown={e => {
                      e.stopPropagation();
                      wrapperRef.current?.setPointerCapture(e.pointerId);
                      setResizing({
                        markId: m.id,
                        startX: e.clientX,
                        startY: e.clientY,
                        initW:  baseW,
                        initH:  baseH,
                        curW:   baseW,
                        curH:   baseH,
                      });
                    }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* ── New-text input ────────────────────────────────────────────────── */}
      {pendingText && (
        <div className="absolute"
          style={{ left: pendingText.pxX, top: pendingText.pxY, transform: 'translateY(-50%)', zIndex: 10 }}>
          <textarea
            ref={newTextRef}
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onBlur={commitText}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitText(); }
              if (e.key === 'Escape') cancelText();
            }}
            placeholder="Type here…"
            style={{
              display:      'block',
              width:        180,
              minHeight:    36,
              resize:       'both',
              overflow:     'auto',
              fontFamily:   FONT_FAMILIES[textFontStyle],
              color:        drawColor,
              fontSize:     '1.1rem',
              lineHeight:   1.4,
              border:       '1.5px solid #2383E2',
              borderRadius: 3,
              padding:      '3px 5px',
              background:   'rgba(255,255,255,0.9)',
              outline:      'none',
            }}
          />
        </div>
      )}

      {/* ── Eraser cursor ────────────────────────────────────────────────── */}
      {isEraser && eraserPxPos && (
        <div style={{
          position:        'absolute',
          left:            eraserPxPos.left,
          top:             eraserPxPos.top,
          width:           eraserSizePx,
          height:          eraserSizePx,
          transform:       'translate(-50%, -50%)',
          border:          '1.5px solid #1A1A1A',
          backgroundColor: 'rgba(255,255,255,0.55)',
          pointerEvents:   'none',
          zIndex:          20,
        }} />
      )}
    </div>
  );
}
