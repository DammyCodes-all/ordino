"use client";

import { LeftRail } from "@/components/app-shell/left-rail";
import { SessionProvider } from "@/components/app-shell/session-context";
import { ChatPanel } from "@/components/chat/chat-panel";
import { CloudDisclosure } from "@/components/diagnostics/cloud-disclosure";
import { DiagnosticsStrip } from "@/components/diagnostics/diagnostics-strip";
import { PreviewSidebar } from "@/components/pdf-preview/preview-sidebar";

function ShellLayout() {
  return (
    <div className="relative flex h-dvh overflow-hidden bg-background">
      <LeftRail />
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
