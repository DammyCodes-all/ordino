"use client";

import { Cancel01Icon, FileExportIcon } from "@hugeicons/core-free-icons";
import { HighlightSidebar } from "@/components/pdf-analysis/highlight-sidebar";
import { LanguageSelector } from "@/components/pdf-analysis/language-selector";
import { NarrationControls } from "@/components/pdf-analysis/narration-controls";
import { usePdfAnalysis } from "@/components/pdf-analysis/pdf-analysis-context";
import { PdfAnalysisPageViewer } from "@/components/pdf-analysis/pdf-analysis-page-viewer";
import { PdfAnalysisStatus } from "@/components/pdf-analysis/pdf-analysis-status";
import { PdfUpload } from "@/components/pdf-analysis/pdf-upload";
import { AppIcon } from "@/components/ui/app-icon";

export function PdfAnalysisWorkspace() {
  const {
    open,
    closeWorkspace,
    exportAnnotated,
    stage,
    analysis,
    setUserGoal,
    userGoal,
    reanalyze,
  } = usePdfAnalysis();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-stretch justify-center bg-[#3d2918]/28 p-4 backdrop-blur-[3px] sm:p-6">
      <div className="glass-panel flex h-full w-full max-w-[1400px] flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border-subtle px-5 py-4">
          <div>
            <p className="brand-wordmark-solid text-xl">ordino</p>
            <p className="text-sm text-muted">PDF analysis</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!analysis || stage === "ingesting" || stage === "analyzing"}
              onClick={() => void reanalyze()}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm disabled:opacity-40"
            >
              Re-analyze
            </button>
            <button
              type="button"
              disabled={!analysis || stage !== "ready"}
              onClick={() => void exportAnnotated()}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm disabled:opacity-40"
            >
              <AppIcon icon={FileExportIcon} size={16} />
              Export annotated
            </button>
            <button
              type="button"
              onClick={closeWorkspace}
              className="inline-flex size-10 items-center justify-center rounded-full border border-border text-muted hover:text-foreground"
              aria-label="Close analysis"
            >
              <AppIcon icon={Cancel01Icon} size={18} />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
            <PdfUpload />
            <LanguageSelector />
            <label className="flex flex-col gap-1 text-xs text-muted">
              Analysis goal (optional)
              <textarea
                value={userGoal}
                onChange={(event) => setUserGoal(event.target.value)}
                rows={3}
                disabled={stage === "ingesting" || stage === "analyzing"}
                placeholder="e.g. Find deadlines and signature requirements"
                className="rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-foreground disabled:opacity-50"
              />
            </label>
            <PdfAnalysisStatus />
            <NarrationControls />
          </div>

          <div className="min-h-0">
            <PdfAnalysisPageViewer />
          </div>

          <div className="min-h-0">
            <HighlightSidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
