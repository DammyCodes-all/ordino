"use client";

import { useSession } from "@/components/app-shell/session-context";

export function PdfPreview() {
  const { publishedPreview, document, turn } = useSession();

  if (!publishedPreview) {
    return (
      <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-2 px-6 text-center">
        <div className="h-40 w-28 rounded-sm border border-dashed border-border bg-surface-raised/50" />
        <p className="mt-3 text-sm text-muted">No published preview yet</p>
        <p className="max-w-[14rem] text-xs leading-relaxed text-muted-dim">
          Intermediate renders stay hidden. A preview appears only when a turn
          finishes.
        </p>
        {turn.running ? (
          <p className="mt-2 text-xs text-accent animate-pulse-soft">
            Keeping previous preview rules — first publish after completion
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 px-4 py-4">
      <div className="mx-auto w-full max-w-[17rem] flex-1 overflow-hidden rounded-sm border border-border bg-[#f7f7f5] text-[#1a1a1a] shadow-[0_12px_40px_rgba(0,0,0,0.35)] animate-fade-up">
        <div className="border-b border-black/5 px-5 py-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-black/40">
            {document.meta.documentType}
          </p>
          <h2 className="mt-2 font-serif text-lg leading-snug tracking-tight">
            {document.meta.title}
          </h2>
        </div>
        <div className="space-y-3 px-5 py-4 text-[11px] leading-relaxed text-black/75">
          {document.nodes.slice(0, 6).map((node) => {
            if (node.type === "heading") {
              return (
                <p
                  key={node.id}
                  className={`font-semibold text-black ${
                    node.level === 1 ? "text-sm" : "text-xs"
                  }`}
                >
                  {node.text}
                </p>
              );
            }
            if (node.type === "paragraph") {
              return (
                <p key={node.id} className="line-clamp-4">
                  {node.text}
                </p>
              );
            }
            if (node.type === "list") {
              return (
                <ul key={node.id} className="list-disc space-y-1 pl-4">
                  {node.items.slice(0, 4).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              );
            }
            return (
              <p key={node.id} className="text-black/40 italic">
                [{node.type}]
              </p>
            );
          })}
        </div>
        <div className="border-t border-black/5 px-5 py-2 text-[9px] text-black/35">
          Mock page · v{document.version} · final-only publish
        </div>
      </div>
    </div>
  );
}
