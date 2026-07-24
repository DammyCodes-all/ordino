"use client";

import { useSession } from "@/components/app-shell/session-context";
import { DocumentOutline } from "@/components/document-outline/document-outline";
import { PdfPreview } from "@/components/pdf-preview/pdf-preview";
import { StatusPanel } from "@/components/status-panel/status-panel";

const TABS = [
  { id: "outline" as const, label: "Outline" },
  { id: "status" as const, label: "Status" },
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
          <div className="flex flex-1 gap-1 rounded-xl bg-background p-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRightPanelTab(tab.id)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                  rightPanelTab === tab.id
                    ? "bg-surface-raised text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface-hover hover:text-foreground md:hidden"
            onClick={() => setRightPanelOpen(false)}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="flex gap-2 border-b border-border-subtle px-3 py-2">
          <button
            type="button"
            disabled={actionsDisabled || checkpoints.length === 0}
            onClick={undo}
            className="flex-1 rounded-lg border border-border px-2 py-1.5 text-xs text-muted transition-colors hover:text-foreground disabled:opacity-35"
          >
            Undo
          </button>
          <button
            type="button"
            disabled={!publishedPreview}
            onClick={exportPdf}
            className="flex-1 rounded-lg border border-accent-dim bg-accent-soft px-2 py-1.5 text-xs text-accent transition-colors hover:border-accent disabled:opacity-35"
          >
            Export PDF
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {rightPanelTab === "outline" ? <DocumentOutline /> : null}
          {rightPanelTab === "status" ? <StatusPanel /> : null}
          {rightPanelTab === "preview" ? <PdfPreview /> : null}
        </div>
      </aside>
    </>
  );
}
