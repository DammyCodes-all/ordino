"use client";

import { useState } from "react";
import { ChatHistorySidebar } from "@/components/app-shell/chat-history-sidebar";
import { LeftRail } from "@/components/app-shell/left-rail";
import { SessionProvider } from "@/components/app-shell/session-context";
import { ChatPanel } from "@/components/chat/chat-panel";
import { CloudDisclosure } from "@/components/diagnostics/cloud-disclosure";
import { DiagnosticsStrip } from "@/components/diagnostics/diagnostics-strip";
import { PreviewSidebar } from "@/components/pdf-preview/preview-sidebar";

function ShellLayout() {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className="relative flex h-dvh overflow-hidden bg-transparent">
      <nav
        aria-label="Chat navigation"
        className="relative z-30 ml-5 mt-5 mb-5 flex shrink-0 items-stretch"
        onMouseEnter={() => setHistoryOpen(true)}
        onMouseLeave={() => setHistoryOpen(false)}
      >
        <LeftRail />
        <ChatHistorySidebar open={historyOpen} />
      </nav>
      <div className="relative flex min-w-0 flex-1 flex-row overflow-hidden">
        <ChatPanel />
        <DiagnosticsStrip />
      </div>
      {/* Fixed floating panel — outside overflow clip so it stands alone */}
      <PreviewSidebar />
      <CloudDisclosure />
    </div>
  );
}

export function AppShell() {
  return (
    <SessionProvider>
      <ShellLayout />
    </SessionProvider>
  );
}
