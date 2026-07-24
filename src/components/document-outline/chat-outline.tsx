"use client";

import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  SidebarRightIcon,
} from "@hugeicons/core-free-icons";
import { useState } from "react";
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
  const { outline, document, publishedPreview, previewOpen, setPreviewOpen } =
    useSession();
  const [expanded, setExpanded] = useState(true);

  if (outline.length === 0) return null;

  return (
    <div className="mx-auto mb-1.5 w-full max-w-2xl animate-fade-up">
      <div className="overflow-hidden rounded-[1rem] border border-border/80 bg-surface/70 backdrop-blur-md">
        <div className="flex items-center gap-2 px-2.5 py-1.5">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <AppIcon
              icon={expanded ? ArrowDown01Icon : ArrowRight01Icon}
              size={14}
              className="text-muted-dim"
            />
            <span className="truncate text-xs font-medium text-foreground">
              Outline · {document.meta.title}
            </span>
            <span className="shrink-0 text-[10px] text-muted-dim">
              {outline.length} blocks
            </span>
          </button>
          {publishedPreview ? (
            <button
              type="button"
              onClick={() => setPreviewOpen(!previewOpen)}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted transition-colors hover:text-foreground"
            >
              <AppIcon icon={SidebarRightIcon} size={12} />
              {previewOpen ? "Hide preview" : "Open preview"}
            </button>
          ) : null}
        </div>
        {expanded ? (
          <div className="max-h-36 space-y-0 overflow-y-auto border-t border-border-subtle px-1.5 py-1.5">
            {outline.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2 px-1.5 py-1 text-xs text-muted"
              >
                <span className="mt-0.5 w-4 shrink-0 text-center font-mono text-[10px] text-accent-dim">
                  {TYPE_LABELS[item.type] ?? "·"}
                </span>
                <span className="leading-snug text-foreground/80">
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
