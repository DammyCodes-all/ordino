"use client";

import { useRef } from "react";
import { useSession } from "@/components/app-shell/session-context";
import { usePdfAnalysis } from "@/components/pdf-analysis/pdf-analysis-context";

export function PdfUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { startFromUpload, stage } = usePdfAnalysis();
  const { cloudDisclosureAccepted, setDisclosureOpen } = useSession();
  const busy = stage === "ingesting" || stage === "analyzing";

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void startFromUpload(file);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (!cloudDisclosureAccepted) {
            setDisclosureOpen(true);
            return;
          }
          inputRef.current?.click();
        }}
        className="rounded-2xl border border-border bg-surface-raised px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover disabled:opacity-40"
      >
        Upload PDF to analyze
      </button>
      <p className="text-xs text-muted-dim">
        Text-based PDFs only (first 8 pages). Page images and extracted text are
        sent to Google AI Studio after you accept the cloud disclosure.
        Explanations are informational, not legal or financial advice.
      </p>
    </div>
  );
}
