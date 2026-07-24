"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/components/app-shell/session-context";
import {
  downloadFileName,
  renderFakePdfBlob,
} from "@/components/pdf-preview/fake-pdf-document";

type PdfPreviewProps = {
  variant?: "panel" | "main";
};

export function PdfPreview({ variant = "panel" }: PdfPreviewProps) {
  const { publishedPreview, document, turn } = useSession();
  const isMain = variant === "main";
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!publishedPreview || document.nodes.length === 0) {
      setPdfUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    setRendering(true);
    setError(null);

    void renderFakePdfBlob(document)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return objectUrl;
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to render PDF");
      })
      .finally(() => {
        if (!cancelled) setRendering(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [publishedPreview, document]);

  if (!publishedPreview) {
    return (
      <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-2 px-6 text-center">
        <div className="h-40 w-28 rounded-sm border border-dashed border-border bg-surface-raised/50" />
        <p className="mt-3 text-sm text-muted">No published preview yet</p>
        <p className="max-w-[16rem] text-xs leading-relaxed text-muted-dim">
          Intermediate renders stay hidden. A real PDF preview appears when a
          turn finishes.
        </p>
        {turn.running ? (
          <p className="mt-2 text-xs text-accent animate-pulse-soft">
            Generating… stay on Chat to watch workflow status
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border-subtle px-4 py-2">
        <p className="truncate text-[11px] text-muted-dim">
          Fake PDF · A4 · v{document.version}
          {rendering ? " · rendering…" : ""}
        </p>
        {pdfUrl ? (
          <a
            href={pdfUrl}
            download={downloadFileName(document.meta.title)}
            className="text-[11px] text-accent hover:underline"
          >
            Download
          </a>
        ) : null}
      </div>

      <div
        className={`min-h-0 flex-1 ${isMain ? "bg-[#525659]" : "bg-[#3f4245]"}`}
      >
        {error ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-danger">
            {error}
          </div>
        ) : pdfUrl ? (
          <iframe
            title={`PDF preview · ${document.meta.title}`}
            src={pdfUrl}
            className="h-full w-full border-0 bg-[#525659]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted animate-pulse-soft">
            Rendering fake PDF…
          </div>
        )}
      </div>
    </div>
  );
}
