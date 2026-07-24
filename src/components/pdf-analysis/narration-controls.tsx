"use client";

import { usePdfAnalysis } from "@/components/pdf-analysis/pdf-analysis-context";
import { unlockSpeech } from "@/lib/speech";

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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            unlockSpeech();
            playNarration(null);
          }}
          className="rounded-full border border-border px-3 py-1.5 text-sm disabled:opacity-40"
        >
          Play all
        </button>
        <button
          type="button"
          disabled={disabled || !selectedHighlightId}
          onClick={() => {
            unlockSpeech();
            playNarration(selectedHighlightId);
          }}
          className="rounded-full border border-border px-3 py-1.5 text-sm disabled:opacity-40"
        >
          Play selected
        </button>
        {narrationStatus === "paused" ? (
          <button
            type="button"
            onClick={() => {
              unlockSpeech();
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
        <span className="text-xs text-muted-dim">{narrationStatus}</span>
      </div>
      {narrationStatus === "unavailable" ? (
        <p className="text-xs text-danger">
          Browser speech is blocked or has no system voices. Unmute this tab,
          allow sound, and on Linux install{" "}
          <code className="font-mono">speech-dispatcher</code> /{" "}
          <code className="font-mono">espeak-ng</code>, then retry in Chrome.
        </p>
      ) : null}
    </div>
  );
}
