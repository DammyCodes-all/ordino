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
            className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[3px] md:bg-transparent md:backdrop-blur-none md:pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setPreviewOpen(false)}
          />
          <motion.aside
            key="preview-panel"
            initial={{ opacity: 0, x: 36, scale: 0.98, filter: "blur(10px)" }}
            animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: 24, scale: 0.98, filter: "blur(8px)" }}
            transition={{
              type: "spring",
              stiffness: 280,
              damping: 26,
              mass: 0.9,
            }}
            className="glass-panel fixed top-5 right-5 bottom-5 z-50 flex w-[min(calc(100vw-2.5rem),210mm)] flex-col overflow-hidden rounded-[1.75rem]"
          >
            <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 px-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium tracking-tight">
                  Preview
                </p>
                <p className="truncate text-xs text-muted-dim">
                  {document.meta.title}
                  {turn.running ? " · previous version while revising" : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={turn.running}
                onClick={exportPdf}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-sm text-foreground backdrop-blur-md transition-colors hover:bg-white/15 disabled:opacity-35"
              >
                <AppIcon icon={FileExportIcon} size={16} />
                Export
              </button>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted transition-colors hover:bg-white/15 hover:text-foreground"
                aria-label="Close preview"
              >
                <AppIcon icon={Cancel01Icon} size={16} title="Close preview" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-hidden rounded-b-[1.75rem] bg-black/15">
              <PdfPreview variant="main" />
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
