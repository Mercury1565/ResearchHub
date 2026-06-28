import jsPDF from 'jspdf';
import { pdfjsLib } from './pdfUtils';
import type { CanvasMark, PenData, ArrowData, TextData, HighlightData, MarkStyle, FontStyle } from '../types';

const FONT_FAMILIES: Record<FontStyle, string> = {
  'sans-serif':   'Inter, ui-sans-serif, sans-serif',
  'caveat':       '"Caveat", cursive',
  'indie-flower': '"Indie Flower", cursive',
  'patrick-hand': '"Patrick Hand", cursive',
};

const SCALE = 2; // render pages at 2× for crispness, then downscale into the PDF

// Mimics CSS word-wrap: break-word for a canvas context.
// Returns an array of lines that each fit within maxWidth pixels.
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = word;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to:   { x: number; y: number },
  sw: number,
  color: string,
) {
  const len = Math.max(12, sw * 4);
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - len * Math.cos(angle - Math.PI / 6), to.y - len * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(to.x - len * Math.cos(angle + Math.PI / 6), to.y - len * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMarksOnCanvas(ctx: CanvasRenderingContext2D, marks: CanvasMark[], w: number, h: number) {
  const ordered = [
    ...marks.filter(m => m.mark_type === 'highlight'),
    ...marks.filter(m => m.mark_type === 'pen'),
    ...marks.filter(m => m.mark_type === 'arrow'),
    ...marks.filter(m => m.mark_type === 'text'),
  ];

  for (const mark of ordered) {
    const { color, strokeWidth } = mark.style as MarkStyle;
    ctx.save();

    if (mark.mark_type === 'highlight') {
      const d  = mark.data as HighlightData;
      const rx = Math.min(d.x1, d.x2) * w;
      const ry = Math.min(d.y1, d.y2) * h;
      const rw = Math.abs(d.x2 - d.x1) * w;
      const rh = Math.abs(d.y2 - d.y1) * h;
      ctx.globalAlpha = 0.32;
      ctx.fillStyle   = color;
      ctx.fillRect(rx, ry, rw, rh);

    } else if (mark.mark_type === 'pen') {
      const pts = (mark.data as PenData).points;
      if (pts.length < 2) { ctx.restore(); continue; }
      ctx.strokeStyle = color;
      ctx.lineWidth   = strokeWidth * SCALE;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      const px = pts.map(p => ({ x: p.x * w, y: p.y * h }));
      ctx.moveTo(px[0].x, px[0].y);
      for (let i = 1; i < px.length - 1; i++) {
        const mx = (px[i].x + px[i + 1].x) / 2;
        const my = (px[i].y + px[i + 1].y) / 2;
        ctx.quadraticCurveTo(px[i].x, px[i].y, mx, my);
      }
      ctx.lineTo(px[px.length - 1].x, px[px.length - 1].y);
      ctx.stroke();

    } else if (mark.mark_type === 'arrow') {
      const d   = mark.data as ArrowData;
      const pts = d.points;
      ctx.strokeStyle = color;
      ctx.fillStyle   = color;
      ctx.lineWidth   = strokeWidth * SCALE;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';

      if (pts && pts.length >= 2) {
        const px = pts.map(p => ({ x: p.x * w, y: p.y * h }));
        ctx.beginPath();
        ctx.moveTo(px[0].x, px[0].y);
        for (let i = 1; i < px.length - 1; i++) {
          const mx = (px[i].x + px[i + 1].x) / 2;
          const my = (px[i].y + px[i + 1].y) / 2;
          ctx.quadraticCurveTo(px[i].x, px[i].y, mx, my);
        }
        ctx.lineTo(px[px.length - 1].x, px[px.length - 1].y);
        ctx.stroke();
        drawArrowhead(ctx, px[px.length - 2], px[px.length - 1], strokeWidth * SCALE, color);
      } else {
        const x1 = d.x1 * w, y1 = d.y1 * h, x2 = d.x2 * w, y2 = d.y2 * h;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        drawArrowhead(ctx, { x: x1, y: y1 }, { x: x2, y: y2 }, strokeWidth * SCALE, color);
      }

    } else if (mark.mark_type === 'text') {
      const d        = mark.data as TextData;
      // h is already native_height * SCALE (the 2× canvas), so no extra SCALE needed.
      // d.fontSize = BASE_FONT_PX / native_height → fontSize = BASE_FONT_PX * SCALE ≈ 35px
      const fontSize = Math.round((d.fontSize ?? 0.02) * h);
      const lineH    = fontSize * 1.4;
      ctx.fillStyle    = color;
      ctx.font         = `${fontSize}px ${FONT_FAMILIES[d.fontStyle ?? 'caveat']}`;
      ctx.textBaseline = 'middle';

      // Max wrap width: stored fraction → canvas pixels; fall back to 40% of page (CSS default)
      const maxPx = d.width ? d.width * w : 0.4 * w;

      // Honour explicit \n newlines, then word-wrap each paragraph
      const allLines: string[] = [];
      for (const para of d.content.split('\n')) {
        if (!para) { allLines.push(''); continue; }
        allLines.push(...wrapText(ctx, para, maxPx));
      }

      // d.y is the vertical centre of the text block (CSS translateY(-50%))
      const totalH = allLines.length * lineH;
      const startY = d.y * h - totalH / 2 + lineH / 2;
      allLines.forEach((line, i) => ctx.fillText(line, d.x * w, startY + i * lineH));
    }

    ctx.restore();
  }
}

export async function downloadAnnotatedPDF(
  pdfUrl: string,
  marks: CanvasMark[],
  filename: string,
) {
  await document.fonts.ready;

  const pdfDoc   = await pdfjsLib.getDocument(pdfUrl).promise;
  const numPages = pdfDoc.numPages;
  let pdf: jsPDF | null = null;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page      = await pdfDoc.getPage(pageNum);
    const vp1x      = page.getViewport({ scale: 1 });      // page size in pt
    const vp2x      = page.getViewport({ scale: SCALE });  // 2× canvas pixels

    const canvas    = document.createElement('canvas');
    canvas.width    = vp2x.width;
    canvas.height   = vp2x.height;
    const ctx       = canvas.getContext('2d')!;

    await page.render({ canvasContext: ctx, viewport: vp2x }).promise;
    drawMarksOnCanvas(ctx, marks.filter(m => m.page_number === pageNum), vp2x.width, vp2x.height);

    const imgData = canvas.toDataURL('image/jpeg', 0.92);

    if (!pdf) {
      pdf = new jsPDF({ unit: 'pt', format: [vp1x.width, vp1x.height] });
    } else {
      pdf.addPage([vp1x.width, vp1x.height]);
    }
    pdf.addImage(imgData, 'JPEG', 0, 0, vp1x.width, vp1x.height);
  }

  pdf?.save(filename);
}
