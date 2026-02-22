import { useEffect, useState, type RefObject } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { pdfjsLib } from "../lib/pdfWorker";
import PdfPage from "./PdfPage";

const MAX_PAGES = 50;
const MAX_FILE_SIZE_MB = 50;

interface PdfViewerProps {
  file: File;
  containerRef: RefObject<HTMLDivElement | null>;
  onTextExtracted?: (text: string) => void;
}

export default function PdfViewer({
  file,
  onTextExtracted,
}: PdfViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PDFPageProxy[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [isScanned, setIsScanned] = useState(false);
  const [isCapped, setIsCapped] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setLoadError(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const buffer = await file.arrayBuffer();
        if (cancelled) return;

        const loadingTask = pdfjsLib.getDocument({ data: buffer });
        loadingTask.onPassword = () => {
          if (!cancelled) setIsPasswordProtected(true);
        };
        const doc = await loadingTask.promise;

        if (cancelled) return;

        const totalPages = doc.numPages;
        const pagesToLoad = Math.min(totalPages, MAX_PAGES);
        if (totalPages > MAX_PAGES) setIsCapped(true);

        const pageProxies: PDFPageProxy[] = [];
        for (let i = 1; i <= pagesToLoad; i++) {
          const p = await doc.getPage(i);
          if (cancelled) return;
          pageProxies.push(p);
        }

        setPdfDoc(doc);
        setPages(pageProxies);

        // Extract all text to pass to SaveSourceBanner
        if (onTextExtracted) {
          const textParts: string[] = [];
          let totalItems = 0;
          for (const p of pageProxies) {
            const tc = await p.getTextContent();
            totalItems += tc.items.length;
            const pageText = tc.items
              .map((item) => ("str" in item ? item.str : ""))
              .join(" ");
            textParts.push(pageText);
          }
          if (totalItems === 0) setIsScanned(true);
          onTextExtracted(textParts.join("\n\n"));
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Failed to load PDF.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      pdfDoc?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
        Loading PDF...
      </div>
    );
  }

  if (isPasswordProtected) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="rounded-lg bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300 max-w-md text-center">
          This PDF is password-protected and cannot be opened.
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="rounded-lg bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-300 max-w-md text-center">
          {loadError}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0 pb-8">
      {isCapped && (
        <div className="w-full px-4 py-2 mb-2 rounded-lg bg-amber-950 border border-amber-800 text-amber-300 text-sm text-center">
          This PDF has {pdfDoc?.numPages} pages. Only the first {MAX_PAGES} are
          shown.
        </div>
      )}
      {isScanned && (
        <div className="w-full px-4 py-2 mb-2 rounded-lg bg-amber-950 border border-amber-800 text-amber-300 text-sm text-center">
          This PDF appears to be a scanned document — text cannot be selected.
          Consider using an OCR tool first.
        </div>
      )}
      {pages.map((page, i) => (
        <PdfPage
          key={i}
          page={page}
          pageNum={i + 1}
          totalPages={pages.length}
        />
      ))}
    </div>
  );
}
