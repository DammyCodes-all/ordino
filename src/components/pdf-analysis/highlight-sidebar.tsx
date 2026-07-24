"use client";

import { usePdfAnalysis } from "@/components/pdf-analysis/pdf-analysis-context";

export function HighlightSidebar() {
  const {
    highlights,
    selectedHighlightId,
    setSelectedHighlightId,
    setCurrentPage,
    summary,
  } = usePdfAnalysis();

  const selected =
    highlights.find((highlight) => highlight.id === selectedHighlightId) ??
    null;

  return (
    <aside className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto rounded-[1.5rem] border border-border-subtle bg-surface/60 p-3">
        <p className="mb-2 px-1 text-[11px] tracking-[0.14em] text-muted-dim uppercase">
          Highlights
        </p>
        {highlights.length === 0 ? (
          <p className="px-1 text-sm text-muted-dim">No highlights yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {highlights.map((highlight) => {
              const active = highlight.id === selectedHighlightId;
              return (
                <li key={highlight.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHighlightId(highlight.id);
                      setCurrentPage(highlight.pageNumber);
                    }}
                    className={`w-full rounded-2xl px-3 py-2.5 text-left transition-colors ${
                      active
                        ? "bg-accent-soft text-foreground"
                        : "text-muted hover:bg-surface-hover hover:text-foreground"
                    }`}
                  >
                    <span className="block text-xs text-muted-dim">
                      p.{highlight.pageNumber} · {highlight.kind} ·{" "}
                      {highlight.severity}
                    </span>
                    <span className="mt-1 block line-clamp-2 text-sm">
                      {highlight.plainLanguageText}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-[1.5rem] border border-border bg-surface-raised p-4">
        {selected ? (
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-[11px] tracking-[0.12em] text-muted-dim uppercase">
                Source
              </p>
              <p className="mt-1 text-foreground">{selected.sourceText}</p>
            </div>
            <div>
              <p className="text-[11px] tracking-[0.12em] text-muted-dim uppercase">
                Explanation
              </p>
              <p className="mt-1 text-foreground">
                {selected.plainLanguageText}
              </p>
            </div>
            <div>
              <p className="text-[11px] tracking-[0.12em] text-muted-dim uppercase">
                Translation
              </p>
              <p className="mt-1 text-foreground">{selected.translatedText}</p>
            </div>
            <div>
              <p className="text-[11px] tracking-[0.12em] text-muted-dim uppercase">
                Why
              </p>
              <p className="mt-1 text-muted">{selected.reason}</p>
            </div>
            <p className="text-xs text-muted-dim">
              Confidence {(selected.confidence * 100).toFixed(0)}%
              {selected.boundingBoxes.length === 0
                ? " · overlay unavailable"
                : ""}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-dim">
            Select a highlight to inspect source text, explanation, and
            translation.
          </p>
        )}
        {summary &&
        (summary.topDeadlines.length > 0 ||
          summary.topRequiredActions.length > 0 ||
          summary.criticalRisks.length > 0) ? (
          <div className="mt-4 space-y-2 border-t border-border-subtle pt-3 text-xs text-muted">
            {summary.topDeadlines.slice(0, 3).map((item) => (
              <p key={item}>Deadline: {item}</p>
            ))}
            {summary.topRequiredActions.slice(0, 3).map((item) => (
              <p key={item}>Action: {item}</p>
            ))}
            {summary.criticalRisks.slice(0, 3).map((item) => (
              <p key={item}>Risk: {item}</p>
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
