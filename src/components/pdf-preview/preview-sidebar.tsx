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

  if (!previewOpen) {
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
      <aside className="fixed inset-y-0 right-0 z-40 flex h-full w-[min(100%,22rem)] flex-col border-l border-border-subtle bg-surface shadow-2xl animate-fade-up md:static md:z-auto md:w-[40%] md:min-w-[16rem] md:max-w-[40%] md:shadow-none">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border-subtle px-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium tracking-tight">
              Preview
            </p>
            <p className="truncate text-[11px] text-muted-dim">
              {publishedPreview
                ? document.meta.title
                : "Waiting for a published PDF"}
              {turn.running ? " · previous version while revising" : ""}
            </p>
          </div>
          <button
            type="button"
            disabled={turn.running || !publishedPreview}
            onClick={exportPdf}
            className="rounded-lg border border-accent-dim bg-accent-soft px-2.5 py-1.5 text-xs text-accent transition-colors hover:border-accent disabled:opacity-35"
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => setPreviewOpen(false)}
            className="flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            aria-label="Close preview"
          >
            ×
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#0e0e10]">
          <PdfPreview variant="main" />
        </div>
      </aside>
    </>
  );
}
