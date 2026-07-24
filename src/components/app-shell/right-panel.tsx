"use client";

import { useSession } from "@/components/app-shell/session-context";
import { DocumentOutline } from "@/components/document-outline/document-outline";
import { PdfPreview } from "@/components/pdf-preview/pdf-preview";

const TABS = [
  { id: "outline" as const, label: "Outline" },
  { id: "preview" as const, label: "Preview" },
];

export function RightPanel() {
  const {
    rightPanelOpen,
    rightPanelTab,
    setRightPanelOpen,
    setRightPanelTab,
    actionsDisabled,
    checkpoints,
    publishedPreview,
    turn,
    undo,
    exportPdf,
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
          <p className="flex-1 truncate px-1 text-sm font-medium tracking-tight">
            Document
          </p>
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
          {rightPanelTab === "outline" ? <DocumentOutline /> : null}
          {rightPanelTab === "preview" ? <PdfPreview /> : null}
        </div>

        <nav className="shrink-0 border-t border-border-subtle bg-surface px-3 py-3">
          <div className="flex gap-1 rounded-xl bg-background p-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRightPanelTab(tab.id)}
                className={`flex-1 rounded-lg px-2 py-2 text-xs transition-colors ${
                  rightPanelTab === tab.id
                    ? "bg-surface-raised text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </aside>
    </>
  );
}
