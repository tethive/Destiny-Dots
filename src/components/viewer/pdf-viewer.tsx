"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle, Minus, Plus } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

// Stable reference: react-pdf reloads the document when options change identity.
const pdfOptions = { withCredentials: true };

/**
 * Renders PDFs to canvas inside the app — no browser PDF toolbar, so there's
 * no download or print button. Pages load progressively via range requests.
 */
export default function PdfViewer({ src }: { src: string }) {
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [width, setWidth] = useState(800);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.min(1000, e.contentRect.width - 16)));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex h-full flex-col" onContextMenu={(e) => e.preventDefault()}>
      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2 text-sm">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft />
          </Button>
          <span className="tabular-nums">
            {page} / {pages || "…"}
          </span>
          <Button variant="ghost" size="icon" aria-label="Next page" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Zoom out" disabled={scale <= 0.6} onClick={() => setScale((s) => +(s - 0.2).toFixed(1))}>
            <Minus />
          </Button>
          <span className="w-12 text-center tabular-nums">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" aria-label="Zoom in" disabled={scale >= 2.4} onClick={() => setScale((s) => +(s + 0.2).toFixed(1))}>
            <Plus />
          </Button>
        </div>
      </div>
      <div ref={box} className="flex-1 overflow-auto bg-muted/30 p-2 select-none">
        <Document
          file={src}
          options={pdfOptions}
          onLoadSuccess={({ numPages }) => setPages(numPages)}
          loading={
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              <LoaderCircle className="animate-spin" />
            </div>
          }
          error={<p className="p-8 text-center text-sm text-muted-foreground">This document couldn&apos;t be loaded.</p>}
          className="flex justify-center"
        >
          <Page pageNumber={page} width={width * scale} renderTextLayer={false} renderAnnotationLayer={false} className="shadow-lg" />
        </Document>
      </div>
    </div>
  );
}
