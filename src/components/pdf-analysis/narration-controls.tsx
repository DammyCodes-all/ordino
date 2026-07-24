"use client";

import { usePdfAnalysis } from "@/components/pdf-analysis/pdf-analysis-context";

export function NarrationControls() {
  const {
    narration,
    narrationStatus,
    selectedHighlightId,
    playNarration,
    pauseNarration,
    stopNarration,
  } = usePdfAnalysis();

  const disabled = !narration || narration.segments.length === 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => playNarration(null)}
        className="rounded-full border border-border px-3 py-1.5 text-sm disabled:opacity-40"
      >
        Play all
      </button>
      <button
        type="button"
        disabled={disabled || !selectedHighlightId}
        onClick={() => playNarration(selectedHighlightId)}
        className="rounded-full border border-border px-3 py-1.5 text-sm disabled:opacity-40"
      >
        Play selected
      </button>
      <button
        type="button"
        disabled={narrationStatus !== "playing"}
        onClick={pauseNarration}
        className="rounded-full border border-border px-3 py-1.5 text-sm disabled:opacity-40"
      >
        Pause
      </button>
      <button
        type="button"
        disabled={narrationStatus === "idle"}
        onClick={stopNarration}
        className="rounded-full border border-border px-3 py-1.5 text-sm disabled:opacity-40"
      >
        Stop
      </button>
      <span className="text-xs text-muted-dim">{narrationStatus}</span>
    </div>
  );
}
