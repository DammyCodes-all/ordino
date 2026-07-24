"use client";

import { Cancel01Icon, FileExportIcon } from "@hugeicons/core-free-icons";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "@/components/app-shell/session-context";
import { PdfPreview } from "@/components/pdf-preview/pdf-preview";
import { AppIcon } from "@/components/ui/app-icon";

const PANEL_RADIUS = 32;

export function PreviewSidebar() {
  const {
    previewOpen,
    publishedPreview,
    setPreviewOpen,
    document: sessionDocument,
    turn,
    exportPdf,
  } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const visible = previewOpen && publishedPreview;

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
            className="pointer-events-auto absolute inset-0 bg-black/25 backdrop-blur-[2px] md:bg-transparent md:backdrop-blur-none md:pointer-events-none"
            onClick={() => setPreviewOpen(false)}
          />

          {/* Outer spacer keeps the panel away from every wall */}
          <div className="pointer-events-none relative z-10 flex h-full w-[min(100%,calc(210mm+3rem))] shrink-0 items-stretch py-8 pr-6 pl-3 sm:py-10 sm:pr-8">
            <motion.aside
              key="preview-panel"
              initial={{ opacity: 0, x: 40, filter: "blur(12px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: 28, filter: "blur(8px)" }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 28,
                mass: 0.9,
              }}
              className="glass-panel pointer-events-auto flex h-full w-full max-w-[210mm] flex-col overflow-hidden"
              style={{
                borderRadius: PANEL_RADIUS,
                WebkitBorderRadius: PANEL_RADIUS,
              }}
            >
              <header
                className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5"
                style={{
                  borderTopLeftRadius: PANEL_RADIUS,
                  borderTopRightRadius: PANEL_RADIUS,
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium tracking-tight">
                    Preview
                  </p>
                  <p className="truncate text-xs text-muted-dim">
                    {sessionDocument.meta.title}
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
                  borderBottomLeftRadius: PANEL_RADIUS,
                  borderBottomRightRadius: PANEL_RADIUS,
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
