"use client";

import { useSession } from "@/components/app-shell/session-context";
import { PdfPreview } from "@/components/pdf-preview/pdf-preview";

export function PreviewSidebar() {
  const {
    previewOpen,
    publishedPreview,
    setPreviewOpen,
    document,
    turn,
    exportPdf,
  } = useSession();

  if (!previewOpen || !publishedPreview) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close preview overlay"
        className="fixed inset-0 z-30 bg-black/50 md:hidden"
        onClick={() => setPreviewOpen(false)}
      />
      <aside className="fixed inset-y-0 right-0 z-40 flex h-full w-[min(100%,210mm)] flex-col border-l border-border-subtle bg-surface animate-fade-up md:static md:z-auto md:w-[210mm] md:min-w-[210mm] md:max-w-[210mm] md:shrink-0">
        <header className="flex h-11 shrink-0 items-center gap-1.5 border-b border-border-subtle px-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium tracking-tight">
              Preview
            </p>
            <p className="truncate text-[10px] text-muted-dim">
              {document.meta.title}
              {turn.running ? " · previous version while revising" : ""}
            </p>
          </div>
          <button
            type="button"
            disabled={turn.running}
            onClick={exportPdf}
            className="border border-border bg-primary px-2.5 py-1 text-xs text-primary-foreground transition-opacity disabled:opacity-35"
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => setPreviewOpen(false)}
            className="flex size-7 items-center justify-center text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            aria-label="Close preview"
          >
            ×
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-preview-chrome">
          <PdfPreview variant="main" />
        </div>
      </aside>
    </>
  );
}
