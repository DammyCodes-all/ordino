"use client";

import { LeftRail } from "@/components/app-shell/left-rail";
import { RightPanel } from "@/components/app-shell/right-panel";
import { SessionProvider } from "@/components/app-shell/session-context";
import { ChatPanel } from "@/components/chat/chat-panel";
import { CloudDisclosure } from "@/components/diagnostics/cloud-disclosure";
import { DiagnosticsStrip } from "@/components/diagnostics/diagnostics-strip";

export function AppShell() {
  return (
    <SessionProvider>
      <div className="relative flex h-dvh overflow-hidden bg-background">
        <LeftRail />
        <div className="relative flex min-w-0 flex-1">
          <ChatPanel />
          <RightPanel />
          <DiagnosticsStrip />
        </div>
        <CloudDisclosure />
      </div>
    </SessionProvider>
  );
}
