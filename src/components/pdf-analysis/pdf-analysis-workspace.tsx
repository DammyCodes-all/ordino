"use client";

import { Cancel01Icon, FileExportIcon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { HighlightSidebar } from "@/components/pdf-analysis/highlight-sidebar";
import { LanguageSelector } from "@/components/pdf-analysis/language-selector";
import { NarrationControls } from "@/components/pdf-analysis/narration-controls";
import { usePdfAnalysis } from "@/components/pdf-analysis/pdf-analysis-context";
import { PdfAnalysisPageViewer } from "@/components/pdf-analysis/pdf-analysis-page-viewer";
import { PdfAnalysisStatus } from "@/components/pdf-analysis/pdf-analysis-status";
import { PdfUpload } from "@/components/pdf-analysis/pdf-upload";
import { AppIcon } from "@/components/ui/app-icon";

type MobileTab = "setup" | "page" | "highlights";

export function PdfAnalysisWorkspace() {
  const {
    open,
    closeWorkspace,
    exportAnnotated,
    stage,
    analysis,
    setUserGoal,
    userGoal,
  } = usePdfAnalysis();
  const [mobileTab, setMobileTab] = useState<MobileTab>("setup");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-stretch justify-center bg-[#3d2918]/28 p-0 backdrop-blur-[3px] sm:p-4 md:p-6">
      <div className="glass-panel flex h-full w-full max-w-[1400px] flex-col overflow-hidden rounded-none sm:rounded-[2rem]">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border-subtle px-3 py-3 pt-[max(0.75rem,var(--safe-top))] sm:gap-4 sm:px-5 sm:py-4 sm:pt-4">
          <div className="min-w-0">
            <p className="brand-wordmark-solid text-lg sm:text-xl">ordino</p>
            <p className="truncate text-xs text-muted sm:text-sm">
              PDF analysis
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={!analysis || stage !== "ready"}
              onClick={() => void exportAnnotated()}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs disabled:opacity-40 sm:gap-2 sm:px-4 sm:text-sm"
            >
              <AppIcon icon={FileExportIcon} size={16} />
              <span className="hidden sm:inline">Export annotated</span>
              <span className="sm:hidden">Export</span>
            </button>
            <button
              type="button"
              onClick={closeWorkspace}
              className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted hover:text-foreground sm:size-10"
              aria-label="Close analysis"
            >
              <AppIcon icon={Cancel01Icon} size={18} />
            </button>
          </div>
        </header>

        <div className="flex gap-1 border-b border-border-subtle px-2 py-2 lg:hidden">
          {(
            [
              ["setup", "Setup"],
              ["page", "Page"],
              ["highlights", "Highlights"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMobileTab(id)}
              className={`flex-1 rounded-xl px-2 py-2 text-xs font-medium transition-colors sm:text-sm ${
                mobileTab === id
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:bg-surface-hover"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
          <div
            className={`min-h-0 flex-col gap-4 overflow-y-auto ${
              mobileTab === "setup" ? "flex" : "hidden"
            } lg:flex`}
          >
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

          <div
            className={`min-h-0 ${
              mobileTab === "page" ? "block" : "hidden"
            } lg:block`}
          >
            <PdfAnalysisPageViewer />
          </div>

          <div
            className={`min-h-0 ${
              mobileTab === "highlights" ? "block" : "hidden"
            } lg:block`}
          >
            <HighlightSidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
