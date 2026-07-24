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
      <div className="flex h-full min-h-[20rem] flex-col items-center justify-center gap-3 px-8 text-center">
        <div className="h-44 w-28 rounded-xl border border-dashed border-border bg-surface-raised/50" />
        <p className="mt-3 text-base text-muted">No published preview yet</p>
        <p className="max-w-[18rem] text-sm leading-relaxed text-muted-dim">
          Intermediate renders stay hidden. A PDF preview appears when a turn
          finishes successfully.
        </p>
        {turn.running ? (
          <p className="mt-2 text-sm text-accent animate-pulse-soft">
            Generating… stay on Chat to watch workflow status
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
        <p className="truncate text-xs text-muted-dim">
          PDF · A4 · v{document.version}
          {turn.running ? " · previous version while revising" : ""}
        </p>
        {previewUrl ? (
          <a
            href={previewUrl}
            download={downloadFileName(document.meta.title)}
            className="text-sm text-accent hover:underline"
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
          <div className="flex h-full items-center justify-center text-base text-muted animate-pulse-soft">
            Preparing preview…
          </div>
        )}
      </div>
    </div>
  );
}
