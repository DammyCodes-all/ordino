"use client";

import { usePdfAnalysis } from "@/components/pdf-analysis/pdf-analysis-context";
import { unlockMediaPlayback } from "@/lib/speech";

export function NarrationControls() {
  const {
    narration,
    narrationStatus,
    selectedHighlightId,
    playNarration,
    pauseNarration,
    resumeNarration,
    stopNarration,
  } = usePdfAnalysis();

  const disabled = !narration || narration.segments.length === 0;

  function start(highlightId: string | null) {
    // Must run in the click handler so server-audio fallback can autoplay.
    unlockMediaPlayback();
    playNarration(highlightId);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => start(null)}
          className="rounded-full border border-border px-3 py-1.5 text-sm disabled:opacity-40"
        >
          Play all
        </button>
        <button
          type="button"
          disabled={disabled || !selectedHighlightId}
          onClick={() => start(selectedHighlightId)}
          className="rounded-full border border-border px-3 py-1.5 text-sm disabled:opacity-40"
        >
          Play selected
        </button>
        {narrationStatus === "paused" ? (
          <button
            type="button"
            onClick={() => {
              unlockMediaPlayback();
              resumeNarration();
            }}
            className="rounded-full border border-border px-3 py-1.5 text-sm"
          >
            Resume
          </button>
        ) : (
          <button
            type="button"
            disabled={narrationStatus !== "playing"}
            onClick={pauseNarration}
            className="rounded-full border border-border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Pause
          </button>
        )}
        <button
          type="button"
          disabled={narrationStatus === "idle"}
          onClick={stopNarration}
          className="rounded-full border border-border px-3 py-1.5 text-sm disabled:opacity-40"
        >
          Stop
        </button>
        <span className="text-xs text-muted-dim">
          {narrationStatus === "playing"
            ? "playing (server audio)"
            : narrationStatus}
        </span>
      </div>
      {narrationStatus === "unavailable" ? (
        <p className="text-xs text-danger">
          Could not play audio. Unmute this tab and click Play all again.
        </p>
      ) : null}
    </div>
  );
}
