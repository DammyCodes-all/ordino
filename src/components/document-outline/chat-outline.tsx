"use client";

import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  SidebarRightIcon,
} from "@hugeicons/core-free-icons";
import { useRef, useState } from "react";
import { useSession } from "@/components/app-shell/session-context";
import { AppIcon } from "@/components/ui/app-icon";

const TYPE_LABELS: Record<string, string> = {
  heading: "H",
  paragraph: "P",
  list: "L",
  table: "T",
  quote: "Q",
  callout: "C",
  divider: "—",
  page_break: "⎘",
};

export function ChatOutline() {
  const {
    outline,
    document,
    publishedPreview,
    previewOpen,
    setPreviewOpen,
    turn,
    liveToolCalls,
  } = useSession();
  const [expanded, setExpanded] = useState(true);
  const liveKeyRef = useRef(0);

  const isRunning = turn.running;
  const liveAdds = liveToolCalls.filter((tc) => tc.action === "addNode");
  const hasLive = isRunning && liveAdds.length > 0;
  const displayOutline = hasLive
    ? liveAdds.map((tc) => ({
        id: tc.nodeId || `live-${liveKeyRef.current++}`,
        type: "paragraph" as const,
        preview:
          tc.label?.replace(/^[^:]*:\s*/, "").slice(0, 120) ||
          tc.label?.slice(0, 120) ||
          "Adding content...",
      }))
    : outline;

  if (displayOutline.length === 0) return null;

  const blockCount = displayOutline.length;

  return (
    <div className="mx-auto mb-3 w-full max-w-2xl animate-fade-up">
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-surface/50 backdrop-blur-[2px]">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <AppIcon
              icon={expanded ? ArrowDown01Icon : ArrowRight01Icon}
              size={16}
              className="text-muted-dim"
            />
            <span className="truncate text-sm font-medium text-foreground flex items-center gap-2">
              Outline · {document.meta.title}
              {hasLive ? (
                <span className="size-1.5 rounded-full bg-accent animate-pulse-soft" />
              ) : null}
            </span>
            <span className="shrink-0 text-xs text-muted-dim">
              {blockCount} blocks{hasLive ? " · live" : ""}
            </span>
          </button>
          {publishedPreview ? (
            <button
              type="button"
              onClick={() => setPreviewOpen(!previewOpen)}
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:text-foreground"
            >
              <AppIcon icon={SidebarRightIcon} size={14} />
              {previewOpen ? "Hide preview" : "Open preview"}
            </button>
          ) : null}
        </div>
        {expanded ? (
          <div className="max-h-52 space-y-1 overflow-y-auto border-t border-border-subtle px-3 py-3">
            {displayOutline.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-xl px-3 py-2 text-sm text-muted"
              >
                <span className="mt-0.5 w-5 shrink-0 text-center font-mono text-xs text-accent-dim">
                  {TYPE_LABELS[item.type] ?? "·"}
                </span>
                <span className="leading-snug text-foreground/80 truncate">
                  {item.preview}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
