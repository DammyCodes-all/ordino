"use client";

import { useSession } from "@/components/app-shell/session-context";

type PdfPreviewProps = {
  variant?: "panel" | "main";
};

export function PdfPreview({ variant = "panel" }: PdfPreviewProps) {
  const { publishedPreview, document, turn } = useSession();
  const isMain = variant === "main";

  if (!publishedPreview) {
    return (
      <div className="flex h-full min-h-[16rem] flex-col items-center justify-center gap-2 px-6 text-center">
        <div className="h-40 w-28 rounded-sm border border-dashed border-border bg-surface-raised/50" />
        <p className="mt-3 text-sm text-muted">No published preview yet</p>
        <p className="max-w-[16rem] text-xs leading-relaxed text-muted-dim">
          Intermediate renders stay hidden. A preview appears only when a turn
          finishes — then use the Preview tab above.
        </p>
        {turn.running ? (
          <p className="mt-2 text-xs text-accent animate-pulse-soft">
            Generating… stay on Chat to watch workflow status
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`flex h-full flex-col items-center ${
        isMain ? "gap-4 px-4 py-8 sm:px-8" : "gap-3 px-4 py-4"
      }`}
    >
      <div
        className={`w-full overflow-hidden rounded-sm border border-border bg-[#f7f7f5] text-[#1a1a1a] shadow-[0_12px_40px_rgba(0,0,0,0.35)] animate-fade-up ${
          isMain ? "max-w-[32rem]" : "max-w-[17rem] flex-1"
        }`}
      >
        <div
          className={`border-b border-black/5 ${isMain ? "px-8 py-6" : "px-5 py-4"}`}
        >
          <p className="text-[10px] uppercase tracking-[0.18em] text-black/40">
            {document.meta.documentType}
          </p>
          <h2
            className={`mt-2 font-serif leading-snug tracking-tight ${
              isMain ? "text-2xl" : "text-lg"
            }`}
          >
            {document.meta.title}
          </h2>
        </div>
        <div
          className={`space-y-3 leading-relaxed text-black/75 ${
            isMain ? "px-8 py-6 text-sm" : "px-5 py-4 text-[11px]"
          }`}
        >
          {document.nodes.map((node) => {
            if (node.type === "heading") {
              return (
                <p
                  key={node.id}
                  className={`font-semibold text-black ${
                    node.level === 1
                      ? isMain
                        ? "text-lg"
                        : "text-sm"
                      : isMain
                        ? "text-base"
                        : "text-xs"
                  }`}
                >
                  {node.text}
                </p>
              );
            }
            if (node.type === "paragraph") {
              return (
                <p
                  key={node.id}
                  className={isMain ? undefined : "line-clamp-4"}
                >
                  {node.text}
                </p>
              );
            }
            if (node.type === "list") {
              return (
                <ul key={node.id} className="list-disc space-y-1 pl-4">
                  {node.items.map((item) => (
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
        <div
          className={`border-t border-black/5 text-black/35 ${
            isMain ? "px-8 py-3 text-[10px]" : "px-5 py-2 text-[9px]"
          }`}
        >
          Mock page · v{document.version} · final-only publish
        </div>
      </div>
      {isMain ? (
        <p className="max-w-md text-center text-xs text-muted-dim">
          This is the published preview. Switch back to Chat to revise by
          prompting.
        </p>
      ) : null}
    </div>
  );
}
