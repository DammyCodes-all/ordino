"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChatHistoryDrawer,
  ChatHistorySidebar,
} from "@/components/app-shell/chat-history-sidebar";
import { LeftRail } from "@/components/app-shell/left-rail";
import { SessionProvider } from "@/components/app-shell/session-context";
import { ChatPanel } from "@/components/chat/chat-panel";
import { CloudDisclosure } from "@/components/diagnostics/cloud-disclosure";
import { DiagnosticsStrip } from "@/components/diagnostics/diagnostics-strip";
import { PdfAnalysisProvider } from "@/components/pdf-analysis/pdf-analysis-context";
import { PdfAnalysisWorkspace } from "@/components/pdf-analysis/pdf-analysis-workspace";
import { PreviewSidebar } from "@/components/pdf-preview/preview-sidebar";

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return desktop;
}

function ShellLayout() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const isDesktop = useIsDesktop();

  const toggleHistory = useCallback(() => {
    setHistoryOpen((value) => !value);
  }, []);

  return (
    <div className="relative flex h-dvh max-h-dvh flex-col overflow-hidden bg-transparent md:flex-row">
      <nav
        aria-label="Chat navigation"
        className="relative z-30 order-2 md:order-1 md:ml-5 md:mt-5 md:mb-5 md:flex md:shrink-0 md:items-stretch"
        onMouseEnter={() => {
          if (isDesktop) setHistoryOpen(true);
        }}
        onMouseLeave={() => {
          if (isDesktop) setHistoryOpen(false);
        }}
      >
        {/* Desktop rail sits in flow; mobile rail is fixed bottom inside LeftRail */}
        <div className="hidden h-full md:flex md:items-stretch">
          <LeftRail
            historyOpen={historyOpen}
            onToggleHistory={toggleHistory}
          />
          <ChatHistorySidebar open={historyOpen} />
        </div>
      </nav>

      {/* Mobile bottom rail (LeftRail renders fixed; this mounts it once) */}
      <div className="md:hidden">
        <LeftRail historyOpen={historyOpen} onToggleHistory={toggleHistory} />
      </div>

      <div className="relative order-1 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:order-2 md:flex-row">
        <ChatPanel />
        <DiagnosticsStrip />
      </div>

      <ChatHistoryDrawer
        open={historyOpen && !isDesktop}
        onClose={() => setHistoryOpen(false)}
      />
      <PreviewSidebar />
      <CloudDisclosure />
      <PdfAnalysisWorkspace />
    </div>
  );
}

export function AppShell() {
  return (
    <SessionProvider>
      <PdfAnalysisProvider>
        <ShellLayout />
      </PdfAnalysisProvider>
    </SessionProvider>
  );
}
