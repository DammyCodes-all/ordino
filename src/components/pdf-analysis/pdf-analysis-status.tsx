"use client";

import { usePdfAnalysis } from "@/components/pdf-analysis/pdf-analysis-context";

export function PdfAnalysisStatus() {
  const { stage, statusMessage, errorMessage, summary } = usePdfAnalysis();

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface/70 px-4 py-3">
      <p className="text-xs tracking-[0.12em] text-muted-dim uppercase">
        {stage}
      </p>
      <p className="mt-1 text-sm text-foreground">{statusMessage}</p>
      {errorMessage ? (
        <p className="mt-2 text-sm text-danger">{errorMessage}</p>
      ) : null}
      {summary?.summary ? (
        <p className="mt-3 text-sm text-muted">{summary.summary}</p>
      ) : null}
      <p className="mt-3 text-[11px] leading-relaxed text-muted-dim">
        Explanations are informational only and are not legal or financial
        advice. Document processing stays local; analysis requires internet
        access and sends page images plus extracted text to Google AI Studio.
        Your API key never leaves the server.
      </p>
    </div>
  );
}
