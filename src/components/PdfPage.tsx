import { useEffect, useRef } from "react";
import type { PDFPageProxy } from "pdfjs-dist";
import { pdfjsLib } from "../lib/pdfWorker";

const BASE_SCALE = 1.5;

interface PdfPageProps {
  page: PDFPageProxy;
  pageNum: number;
  totalPages: number;
}

export default function PdfPage({ page, pageNum, totalPages }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);

  const dpr = window.devicePixelRatio || 1;
  const scale = BASE_SCALE * dpr;
  const viewport = page.getViewport({ scale });
  const cssWidth = viewport.width / dpr;
  const cssHeight = viewport.height / dpr;

  useEffect(() => {
    const canvas = canvasRef.current;
    const textDiv = textLayerRef.current;
    if (!canvas || !textDiv) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const renderTask = page.render({ canvas, canvasContext: ctx, viewport });

    renderTask.promise.then(() => {
      // Clear previous text layer content
      textDiv.innerHTML = "";

      page.getTextContent().then((textContent) => {
        const textLayer = new pdfjsLib.TextLayer({
          textContentSource: textContent,
          container: textDiv,
          viewport,
        });
        textLayer.render().catch(() => {
          // Silently ignore text layer render errors
        });
      });
    });

    return () => {
      renderTask.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="flex flex-col items-center">
      <p className="text-xs text-gray-600 py-2">
        Page {pageNum} of {totalPages}
      </p>
      <div
        style={{ position: "relative", width: cssWidth, height: cssHeight }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: cssWidth, height: cssHeight, display: "block" }}
        />
        <div
          ref={textLayerRef}
          className="textLayer"
          style={{ width: cssWidth, height: cssHeight }}
        />
      </div>
    </div>
  );
}
