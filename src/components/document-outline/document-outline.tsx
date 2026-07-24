"use client";

import { useSession } from "@/components/app-shell/session-context";

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

export function DocumentOutline() {
  const { outline, document } = useSession();

  if (outline.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-muted-dim">
        Outline appears after the first successful turn.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 px-3 py-3">
      <p className="mb-2 px-1 text-[11px] uppercase tracking-wider text-muted-dim">
        {document.meta.title}
      </p>
      {outline.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-2 rounded-lg px-2 py-2 text-sm text-muted"
        >
          <span className="mt-0.5 w-4 shrink-0 text-center font-mono text-[10px] text-accent-dim">
            {TYPE_LABELS[item.type] ?? "·"}
          </span>
          <span className="leading-snug text-foreground/85">
            {item.preview}
          </span>
        </div>
      ))}
    </div>
  );
}
