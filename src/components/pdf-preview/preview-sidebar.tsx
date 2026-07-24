"use client";

import {
  AiScanIcon,
  Cancel01Icon,
  FileExportIcon,
} from "@hugeicons/core-free-icons";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "@/components/app-shell/session-context";
import { usePdfAnalysis } from "@/components/pdf-analysis/pdf-analysis-context";
import { PdfPreview } from "@/components/pdf-preview/pdf-preview";
import { AppIcon } from "@/components/ui/app-icon";

const PANEL_RADIUS_DESKTOP = 32;
const PANEL_RADIUS_MOBILE = 20;

export function PreviewSidebar() {
  const {
    previewOpen,
    publishedPreview,
    publishedRender,
    setPreviewOpen,
    document: sessionDocument,
    outline,
    turn,
    exportPdf,
    cloudDisclosureAccepted,
    setDisclosureOpen,
  } = useSession();
  const { startFromGenerated } = usePdfAnalysis();
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setMounted(true);
    const query = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const visible = previewOpen && publishedPreview;
  const radius = isDesktop ? PANEL_RADIUS_DESKTOP : PANEL_RADIUS_MOBILE;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="preview-shell"
          className="pointer-events-none fixed inset-0 z-[60] flex items-stretch justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            aria-label="Close preview overlay"
            className="pointer-events-auto absolute inset-0 bg-black/30 backdrop-blur-[2px] lg:bg-transparent lg:backdrop-blur-none lg:pointer-events-none"
            onClick={() => setPreviewOpen(false)}
          />

          <div className="pointer-events-none relative z-10 flex h-full w-full max-w-full shrink-0 items-stretch p-3 pb-[calc(var(--mobile-nav-height)+var(--safe-bottom)+0.5rem)] sm:p-5 md:w-[min(100%,calc(210mm+2rem))] md:py-8 md:pr-6 md:pl-3 md:pb-8 lg:w-[min(100%,calc(210mm+3rem))] lg:py-10 lg:pr-8">
            <motion.aside
              key="preview-panel"
              initial={{ opacity: 0, y: 24, filter: "blur(12px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 16, filter: "blur(8px)" }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 28,
                mass: 0.9,
              }}
              className="glass-panel pointer-events-auto flex h-full w-full max-w-none flex-col overflow-hidden md:max-w-[210mm]"
              style={{
                borderRadius: radius,
                WebkitBorderRadius: radius,
              }}
            >
              <header
                className="flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2 sm:min-h-16 sm:gap-3 sm:px-5"
                style={{
                  borderTopLeftRadius: radius,
                  borderTopRightRadius: radius,
                }}
              >
                <div className="min-w-0 flex-1 basis-[40%]">
                  <p className="truncate text-sm font-medium tracking-tight">
                    Preview
                  </p>
                  <p className="truncate text-xs text-muted-dim">
                    {sessionDocument.meta.title}
                    {turn.running ? " · revising" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={turn.running || !publishedRender}
                  onClick={() => {
                    if (!publishedRender) return;
                    if (!cloudDisclosureAccepted) {
                      setDisclosureOpen(true);
                      return;
                    }
                    void startFromGenerated(
                      sessionDocument,
                      publishedRender,
                      outline,
                    );
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs text-foreground backdrop-blur-md transition-colors hover:bg-white/15 disabled:opacity-35 sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
                >
                  <AppIcon icon={AiScanIcon} size={16} />
                  <span className="hidden sm:inline">Analyze</span>
                </button>
                <button
                  type="button"
                  disabled={turn.running}
                  onClick={exportPdf}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs text-foreground backdrop-blur-md transition-colors hover:bg-white/15 disabled:opacity-35 sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
                >
                  <AppIcon icon={FileExportIcon} size={16} />
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted transition-colors hover:bg-white/15 hover:text-foreground sm:size-10"
                  aria-label="Close preview"
                >
                  <AppIcon
                    icon={Cancel01Icon}
                    size={16}
                    title="Close preview"
                  />
                </button>
              </header>

              <div
                className="min-h-0 flex-1 overflow-hidden bg-black/15"
                style={{
                  borderBottomLeftRadius: radius,
                  borderBottomRightRadius: radius,
                }}
              >
                <PdfPreview variant="main" />
              </div>
            </motion.aside>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    window.document.body,
  );
}
