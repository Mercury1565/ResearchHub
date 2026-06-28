import { useEffect } from "react";
import { useWorkspaceStore } from "../../store/workspace";
import { useDeleteCanvasMark } from "../../api/canvasMarks";
import type { DrawTool, FontStyle } from "../../types";

// ── Icons ─────────────────────────────────────────────────────────────────────

function PenIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="2" y1="12" x2="12" y2="2" />
      <polyline points="7,2 12,2 12,7" />
    </svg>
  );
}

function HighlightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      {/* Highlighted band */}
      <rect x="1" y="5" width="12" height="4" rx="1" fill="currentColor" fillOpacity="0.45" />
      {/* Text lines above and below */}
      <line x1="3" y1="3" x2="11" y2="3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="3" y1="11" x2="11" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function MoveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <path d="M7 1L5.5 3h3L7 1zm0 12L8.5 11h-3L7 13zM1 7l2 1.5V5.5L1 7zm12 0l-2-1.5V8.5L13 7z" />
      <circle cx="7" cy="7" r="1.5" />
    </svg>
  );
}

function EraserIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 15 15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Eraser body */}
      <path
        d="M2.5 11.5L6 4.5h6L9.5 11.5H2.5z"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <path d="M2.5 11.5L6 4.5h6L9.5 11.5H2.5z" />
      {/* Dividing line (rubber / grip section) */}
      <line x1="5.5" y1="4.5" x2="8.5" y2="11.5" />
      {/* Base line */}
      <line x1="1.5" y1="13" x2="12.5" y2="13" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 5h6a4 4 0 0 1 0 8H4" />
      <polyline points="2,2 2,5 5,5" />
    </svg>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DRAW_TOOLS: { tool: DrawTool; icon: React.ReactNode; title: string }[] = [
  {
    tool: "arrow",
    icon: <ArrowIcon />,
    title: "Arrow — drag to place an arrow",
  },
  { tool: "pen", icon: <PenIcon />, title: "Pen — freehand drawing" },
  {
    tool: "text",
    icon: <span className="text-[11px] font-medium leading-none">T</span>,
    title: "Text — click to place a handwriting note",
  },
  {
    tool: "highlight",
    icon: <HighlightIcon />,
    title: "Highlight — drag to highlight text with color",
  },
  {
    tool: "move",
    icon: <MoveIcon />,
    title: "Move — drag any mark to reposition it",
  },
  {
    tool: "eraser",
    icon: <EraserIcon />,
    title: "Eraser — click any mark to delete it",
  },
];

const COLORS = [
  { hex: "#1A1A1A", label: "Black" },
  { hex: "#E03E3E", label: "Red" },
  { hex: "#2383E2", label: "Blue" },
  { hex: "#008B47", label: "Green" },
  { hex: "#D97706", label: "Amber" },
];

const HIGHLIGHT_COLORS = [
  { hex: "#FFD600", label: "Yellow" },
  { hex: "#69F0AE", label: "Green" },
  { hex: "#40C4FF", label: "Blue" },
  { hex: "#FF80AB", label: "Pink" },
  { hex: "#FF9E40", label: "Orange" },
];

const WIDTHS: { value: number; label: string }[] = [
  { value: 1.5, label: "S" },
  { value: 2.5, label: "M" },
  { value: 4, label: "L" },
];

const FONTS: { value: FontStyle; label: string }[] = [
  { value: "caveat", label: "Caveat" },
  { value: "indie-flower", label: "Indie Flower" },
  { value: "patrick-hand", label: "Patrick Hand" },
  { value: "sans-serif", label: "Regular" },
];

const FONT_SIZES: { value: number; label: string }[] = [
  { value: 8,  label: "8"  },
  { value: 12, label: "12" },
  { value: 16, label: "16" },
  { value: 24, label: "24" },
];

const FONT_FAMILIES: Record<FontStyle, string> = {
  "sans-serif": "Inter, sans-serif",
  caveat: '"Caveat", cursive',
  "indie-flower": '"Indie Flower", cursive',
  "patrick-hand": '"Patrick Hand", cursive',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function DrawingToolbar() {
  const activeTool      = useWorkspaceStore((s) => s.activeTool);
  const lastDrawTool    = useWorkspaceStore((s) => s.lastDrawTool);
  const drawColor       = useWorkspaceStore((s) => s.drawColor);
  const highlightColor  = useWorkspaceStore((s) => s.highlightColor);
  const strokeWidth     = useWorkspaceStore((s) => s.strokeWidth);
  const textFontStyle   = useWorkspaceStore((s) => s.textFontStyle);
  const textFontSizePt  = useWorkspaceStore((s) => s.textFontSizePt);
  const undoStack       = useWorkspaceStore((s) => s.undoStack);
  const setActiveTool      = useWorkspaceStore((s) => s.setActiveTool);
  const setDrawColor       = useWorkspaceStore((s) => s.setDrawColor);
  const setHighlightColor  = useWorkspaceStore((s) => s.setHighlightColor);
  const setStrokeWidth     = useWorkspaceStore((s) => s.setStrokeWidth);
  const setTextFontStyle   = useWorkspaceStore((s) => s.setTextFontStyle);
  const setTextFontSizePt  = useWorkspaceStore((s) => s.setTextFontSizePt);
  const popUndo            = useWorkspaceStore((s) => s.popUndo);

  const isHighlight = activeTool === "highlight";
  const activeColor = isHighlight ? highlightColor : drawColor;
  const setActiveColor = isHighlight ? setHighlightColor : setDrawColor;
  const colorPalette = isHighlight ? HIGHLIGHT_COLORS : COLORS;

  const deleteMark = useDeleteCanvasMark();

  const isReadMode = activeTool === "select";
  const isDrawMode = !isReadMode;

  // Ctrl/Cmd+Z undo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const handleUndo = () => {
    const entry = popUndo();
    if (!entry) return;
    deleteMark.mutate({ id: entry.markId, documentId: entry.documentId });
  };

  const toggleMode = () => {
    if (isReadMode) {
      setActiveTool(lastDrawTool);
    } else {
      setActiveTool("select");
    }
  };

  return (
    <div className="flex items-center gap-2.5 border-b border-[#E3E2DF] bg-white px-3 py-1.5">
      {/* ── Mode toggle ─────────────────────────────────────────────── */}
      <div className="flex overflow-hidden rounded border border-[#E3E2DF]">
        <button
          onClick={() => isDrawMode && toggleMode()}
          title="Read mode — scroll and select PDF text"
          className={[
            "px-3 py-1 text-xs transition-colors duration-100",
            isReadMode
              ? "bg-[#404040] text-white"
              : "bg-white text-[#6B6B6B] hover:bg-[#F7F7F5]",
          ].join(" ")}
        >
          📖 Read
        </button>
        <button
          onClick={() => isReadMode && toggleMode()}
          title="Doodle mode — annotate the PDF"
          className={[
            "border-l border-[#E3E2DF] px-3 py-1 text-xs transition-colors duration-100",
            isDrawMode
              ? "bg-[#404040] text-white"
              : "bg-white text-[#6B6B6B] hover:bg-[#F7F7F5]",
          ].join(" ")}
        >
          ✏️ Doodle
        </button>
      </div>

      {/* ── Drawing controls (only in draw mode) ────────────────────── */}
      {isDrawMode && (
        <>
          <div className="h-4 w-px bg-[#E3E2DF]" />

          {/* Sub-tools */}
          <div className="flex items-center gap-0.5">
            {DRAW_TOOLS.map(({ tool, icon, title }) => (
              <button
                key={tool}
                title={title}
                onClick={() => setActiveTool(tool)}
                className={[
                  "flex h-7 w-7 items-center justify-center rounded transition-colors duration-100",
                  activeTool === tool
                    ? "bg-[#EFEEEC] text-[#1A1A1A]"
                    : "text-[#6B6B6B] hover:bg-[#EFEEEC] hover:text-[#1A1A1A]",
                ].join(" ")}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* Color swatches — all draw tools except move and eraser */}
          {activeTool !== "move" && activeTool !== "eraser" && (
            <>
              <div className="h-4 w-px bg-[#E3E2DF]" />

              {/* Color swatches */}
              <div className="flex items-center gap-1">
                {colorPalette.map(({ hex, label }) => (
                  <button
                    key={hex}
                    title={label}
                    onClick={() => setActiveColor(hex)}
                    className="relative flex h-5 w-5 items-center justify-center rounded-full transition-transform duration-100 hover:scale-110"
                    style={{ backgroundColor: hex }}
                  >
                    {activeColor === hex && (
                      <span className="block h-2 w-2 rounded-full bg-white/70" />
                    )}
                  </button>
                ))}
              </div>

              <div className="h-4 w-px bg-[#E3E2DF]" />

              {/* Stroke width — pen and arrow only */}
              {activeTool !== "text" && activeTool !== "highlight" && (
                <div className="flex items-center gap-0.5">
                  {WIDTHS.map(({ value, label }) => (
                    <button
                      key={value}
                      title={`Stroke ${label}`}
                      onClick={() => setStrokeWidth(value)}
                      className={[
                        "flex h-6 w-6 items-center justify-center rounded text-xs transition-colors duration-100",
                        strokeWidth === value
                          ? "bg-[#EFEEEC] text-[#1A1A1A]"
                          : "text-[#6B6B6B] hover:bg-[#F7F7F5]",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* Font family + size (text tool only) */}
              {activeTool === "text" && (
                <>
                  <div className="flex items-center gap-0.5">
                    {FONTS.map(({ value, label }) => (
                      <button
                        key={value}
                        title={label}
                        onClick={() => setTextFontStyle(value)}
                        className={[
                          "rounded px-2 py-0.5 text-xs transition-colors duration-100",
                          textFontStyle === value
                            ? "bg-[#EFEEEC] text-[#1A1A1A]"
                            : "text-[#6B6B6B] hover:bg-[#F7F7F5]",
                        ].join(" ")}
                        style={{ fontFamily: FONT_FAMILIES[value] }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="h-4 w-px bg-[#E3E2DF]" />

                  <div className="flex items-center gap-0.5">
                    {FONT_SIZES.map(({ value, label }) => (
                      <button
                        key={value}
                        title={`Font size ${label}pt`}
                        onClick={() => setTextFontSizePt(value)}
                        className={[
                          "rounded px-1.5 py-0.5 text-xs transition-colors duration-100",
                          textFontSizePt === value
                            ? "bg-[#EFEEEC] text-[#1A1A1A] font-medium"
                            : "text-[#6B6B6B] hover:bg-[#F7F7F5]",
                        ].join(" ")}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          <div className="h-4 w-px bg-[#E3E2DF]" />

          {/* Undo */}
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            title="Undo last mark (Ctrl+Z)"
            className={[
              "flex h-7 w-7 items-center justify-center rounded transition-colors duration-100",
              undoStack.length > 0
                ? "text-[#6B6B6B] hover:bg-[#EFEEEC] hover:text-[#1A1A1A]"
                : "text-[#C8C7C4] cursor-not-allowed",
            ].join(" ")}
          >
            <UndoIcon />
          </button>
        </>
      )}
    </div>
  );
}
