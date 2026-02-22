import { useEffect, useRef, useState, useCallback, type RefObject } from "react";
import { cropToDataUrl, type CssRect } from "../lib/imageUtils";
import { extractTextFromRegion } from "../lib/vision";

interface ImageViewerProps {
  file: File;
  extractedTextRef: RefObject<HTMLDivElement | null>;
}

interface Selection {
  rect: CssRect;
  index: number;
}

export default function ImageViewer({ file, extractedTextRef }: ImageViewerProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [imageSrc, setImageSrc] = useState<string>("");
  const [selections, setSelections] = useState<Selection[]>([]);
  const [extractedChunks, setExtractedChunks] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Drag state kept in refs to avoid re-renders during mousemove
  const drawing = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const currentRect = useRef<CssRect | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Create and revoke object URL for the image
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Sync extractedChunks to the extractedTextRef div
  useEffect(() => {
    const el = extractedTextRef.current;
    if (!el) return;
    el.innerText = extractedChunks.join("\n\n");
  }, [extractedChunks, extractedTextRef]);

  // Size the canvas to match the rendered image dimensions
  function syncCanvasSize() {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    canvas.width = img.offsetWidth;
    canvas.height = img.offsetHeight;
  }

  // Draw all selections + the current drag rect onto the canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Completed selections
    for (const sel of selections) {
      const { x, y, w, h } = sel.rect;
      ctx.fillStyle = "rgba(59,130,246,0.15)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "rgb(59,130,246)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);

      // Number label
      ctx.fillStyle = "rgb(59,130,246)";
      ctx.font = "bold 12px sans-serif";
      const label = `[${sel.index}]`;
      const metrics = ctx.measureText(label);
      const lx = x + 4;
      const ly = y + 4;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(lx - 2, ly - 12, metrics.width + 4, 15);
      ctx.fillStyle = "white";
      ctx.fillText(label, lx, ly);
    }

    // Active drag rect
    const r = currentRect.current;
    if (r && drawing.current) {
      ctx.strokeStyle = "rgba(59,130,246,0.8)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.setLineDash([]);
    }
  }, [selections]);

  // Redraw whenever selections change
  useEffect(() => {
    redraw();
  }, [redraw]);

  function getCssRect(x1: number, y1: number, x2: number, y2: number): CssRect {
    return {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      w: Math.abs(x2 - x1),
      h: Math.abs(y2 - y1),
    };
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    e.preventDefault();
    drawing.current = true;
    startPos.current = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
    currentRect.current = null;
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    currentRect.current = getCssRect(
      startPos.current.x,
      startPos.current.y,
      e.nativeEvent.offsetX,
      e.nativeEvent.offsetY,
    );

    if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(redraw);
  }

  async function handleMouseUp(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    drawing.current = false;

    const rect = getCssRect(
      startPos.current.x,
      startPos.current.y,
      e.nativeEvent.offsetX,
      e.nativeEvent.offsetY,
    );
    currentRect.current = null;

    // Ignore tiny accidental clicks
    if (rect.w < 10 || rect.h < 10) {
      redraw();
      return;
    }

    const img = imgRef.current;
    if (!img) return;

    const index = selections.length + 1;
    const newSel: Selection = { rect, index };
    setSelections((prev) => [...prev, newSel]);

    // Crop + OCR
    setExtracting(true);
    setExtractError(null);
    try {
      const dataUrl = cropToDataUrl(img, rect);
      const text = await extractTextFromRegion(dataUrl);
      setExtractedChunks((prev) => [...prev, `[${index}]\n${text}`]);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Extraction failed.");
    } finally {
      setExtracting(false);
    }
  }

  function handleMouseLeave() {
    if (drawing.current) {
      drawing.current = false;
      currentRect.current = null;
      redraw();
    }
  }

  function handleClearSelections() {
    setSelections([]);
    setExtractedChunks([]);
    setExtractError(null);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Image + canvas overlay */}
      <div
        className="relative rounded-lg overflow-hidden border border-gray-700 bg-gray-900"
        style={{ lineHeight: 0 }}
      >
        <img
          ref={imgRef}
          src={imageSrc}
          alt="Uploaded image"
          style={{ width: "100%", height: "auto", display: "block" }}
          onLoad={() => {
            syncCanvasSize();
            redraw();
          }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          style={{ cursor: "crosshair" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 min-h-[24px]">
        {extracting && (
          <span className="text-sm text-blue-400 flex items-center gap-1.5">
            <svg className="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Extracting text…
          </span>
        )}
        {extractError && (
          <span className="text-sm text-red-400">{extractError}</span>
        )}
        {!extracting && selections.length > 0 && (
          <span className="text-xs text-gray-500">
            {selections.length} region{selections.length !== 1 ? "s" : ""} selected · draw more or highlight text below
          </span>
        )}
        {!extracting && selections.length === 0 && (
          <span className="text-xs text-gray-600">Draw a box over a text region to extract it</span>
        )}
      </div>

      {/* Extracted text panel */}
      <div className="rounded-lg border border-gray-700 bg-gray-900">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Extracted Text</span>
          {extractedChunks.length > 0 && (
            <button
              onClick={handleClearSelections}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
            >
              Clear all
            </button>
          )}
        </div>
        <div
          ref={extractedTextRef}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          data-placeholder="Extracted text will appear here. Highlight to generate cards."
          className="min-h-[12rem] p-4 font-mono text-sm leading-relaxed text-gray-200 focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-600"
        />
      </div>
    </div>
  );
}
