"use client";

import { useSession } from "@/components/app-shell/session-context";
import { downloadFileName } from "@/components/pdf-preview/fake-pdf-document";

type PdfPreviewProps = {
  variant?: "panel" | "main";
};

export function PdfPreview({ variant: _variant = "panel" }: PdfPreviewProps) {
  const { publishedPreview, document, turn, previewUrl } = useSession();

  if (!publishedPreview) {
    return (
      <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-2 px-6 text-center">
        <div className="h-36 w-24 border border-dashed border-border bg-surface-raised/50" />
        <p className="mt-2 text-sm text-muted">No published preview yet</p>
        <p className="max-w-[16rem] text-xs leading-relaxed text-muted-dim">
          Intermediate renders stay hidden. A PDF preview appears when a turn
          finishes successfully.
        </p>
        {turn.running ? (
          <p className="mt-1 text-xs text-accent animate-pulse-soft">
            Generating… stay on Chat to watch workflow status
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border-subtle px-3 py-1.5">
        <p className="truncate text-[10px] text-muted-dim">
          PDF · A4 · v{document.version}
          {turn.running ? " · previous version while revising" : ""}
        </p>
        {previewUrl ? (
          <a
            href={previewUrl}
            download={downloadFileName(document.meta.title)}
            className="text-[11px] text-accent hover:underline"
          >
            Download
          </a>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 bg-preview-frame">
        {previewUrl ? (
          <iframe
            title={`PDF preview · ${document.meta.title}`}
            src={previewUrl}
            className="h-full w-full border-0 bg-preview-frame"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted animate-pulse-soft">
            Preparing preview…
          </div>
        )}
      </div>
    </div>
  );
}
