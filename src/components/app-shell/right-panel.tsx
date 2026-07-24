"use client";

import { useSession } from "@/components/app-shell/session-context";
import { DocumentOutline } from "@/components/document-outline/document-outline";

export function RightPanel() {
  const {
    rightPanelOpen,
    setRightPanelOpen,
    actionsDisabled,
    checkpoints,
    publishedPreview,
    turn,
    undo,
    exportPdf,
    document,
  } = useSession();

  if (!rightPanelOpen) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close document panel"
        className="fixed inset-0 z-30 bg-black/50 md:hidden"
        onClick={() => setRightPanelOpen(false)}
      />
      <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[var(--panel-width)] flex-col border-l border-border-subtle bg-surface shadow-2xl md:static md:z-auto md:shadow-none">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border-subtle px-3">
          <div className="min-w-0 flex-1 px-1">
            <p className="truncate text-sm font-medium tracking-tight">
              Outline
            </p>
            <p className="truncate text-[11px] text-muted-dim">
              {document.meta.title}
            </p>
          </div>
          <button
            type="button"
            disabled={actionsDisabled || checkpoints.length === 0}
            onClick={undo}
            className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-foreground disabled:opacity-35"
          >
            Undo
          </button>
          <button
            type="button"
            disabled={!publishedPreview || turn.running}
            onClick={exportPdf}
            className="rounded-lg border border-accent-dim bg-accent-soft px-2.5 py-1.5 text-xs text-accent transition-colors hover:border-accent disabled:opacity-35"
          >
            Export
          </button>
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-foreground md:hidden"
            onClick={() => setRightPanelOpen(false)}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <DocumentOutline />
        </div>

        <p className="shrink-0 border-t border-border-subtle px-4 py-3 text-[11px] leading-relaxed text-muted-dim">
          Read-only structure of the document. Editing is chat-only in v1.
        </p>
      </aside>
    </>
  );
}
