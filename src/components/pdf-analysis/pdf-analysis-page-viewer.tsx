"use client";

import { HighlightOverlay } from "@/components/pdf-analysis/highlight-overlay";
import { usePdfAnalysis } from "@/components/pdf-analysis/pdf-analysis-context";

export function PdfAnalysisPageViewer() {
  const {
    analysis,
    highlights,
    currentPage,
    setCurrentPage,
    selectedHighlightId,
    setSelectedHighlightId,
  } = usePdfAnalysis();

  if (!analysis) {
    return (
      <div className="flex h-full items-center justify-center rounded-[2rem] border border-dashed border-border bg-surface/40 text-sm text-muted">
        Upload a PDF or analyze a generated Ordino PDF to begin.
      </div>
    );
  }

  const page =
    analysis.pages.find((entry) => entry.pageNumber === currentPage) ??
    analysis.pages[0];

  if (!page) return null;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Page {page.pageNumber} of {analysis.pageCount}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-full border border-border px-3 py-1.5 text-sm disabled:opacity-40"
            disabled={page.pageNumber <= 1}
            onClick={() => setCurrentPage(page.pageNumber - 1)}
          >
            Prev
          </button>
          <button
            type="button"
            className="rounded-full border border-border px-3 py-1.5 text-sm disabled:opacity-40"
            disabled={page.pageNumber >= analysis.pageCount}
            onClick={() => setCurrentPage(page.pageNumber + 1)}
          >
            Next
          </button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 overflow-auto rounded-[1.5rem] border border-border bg-white/70 p-3">
        <div
          className="relative mx-auto"
          style={{ maxWidth: Math.min(page.widthPx, 900) }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={page.image.dataUrl}
            alt={`PDF page ${page.pageNumber}`}
            className="block h-auto w-full rounded-lg shadow-sm"
          />
          <HighlightOverlay
            highlights={highlights}
            pageNumber={page.pageNumber}
            pageWidth={page.widthPx}
            pageHeight={page.heightPx}
            selectedId={selectedHighlightId}
            onSelect={(id) => {
              setSelectedHighlightId(id);
            }}
          />
        </div>
      </div>
    </div>
  );
}
