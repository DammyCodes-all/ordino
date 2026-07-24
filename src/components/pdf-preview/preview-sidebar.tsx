"use client";

import { Cancel01Icon, FileExportIcon } from "@hugeicons/core-free-icons";
import { AnimatePresence, motion } from "motion/react";
import { useSession } from "@/components/app-shell/session-context";
import { PdfPreview } from "@/components/pdf-preview/pdf-preview";
import { AppIcon } from "@/components/ui/app-icon";

export function PreviewSidebar() {
  const {
    previewOpen,
    publishedPreview,
    setPreviewOpen,
    document,
    turn,
    exportPdf,
  } = useSession();

  const visible = previewOpen && publishedPreview;

  return (
    <AnimatePresence>
      {visible ? (
        <>
          <motion.button
            key="preview-backdrop"
            type="button"
            aria-label="Close preview overlay"
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setPreviewOpen(false)}
          />
          <motion.aside
            key="preview-panel"
            initial={{ opacity: 0, x: 28, filter: "blur(8px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: 20, filter: "blur(6px)" }}
            transition={{
              type: "spring",
              stiffness: 320,
              damping: 28,
              mass: 0.85,
            }}
            className="glass-panel pointer-events-auto absolute inset-y-3 right-3 z-40 flex w-[min(calc(100%-1.5rem),210mm)] flex-col overflow-hidden rounded-[1.5rem] md:w-[210mm]"
          >
            <header className="flex h-12 shrink-0 items-center gap-2 border-b border-white/10 px-3">
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
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs text-foreground backdrop-blur-md transition-colors hover:bg-white/15 disabled:opacity-35"
              >
                <AppIcon icon={FileExportIcon} size={14} />
                Export
              </button>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted transition-colors hover:bg-white/15 hover:text-foreground"
                aria-label="Close preview"
              >
                <AppIcon icon={Cancel01Icon} size={15} title="Close preview" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-hidden bg-black/20">
              <PdfPreview variant="main" />
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
