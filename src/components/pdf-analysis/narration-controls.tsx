"use client";

import { useState } from "react";
import { usePdfAnalysis } from "@/components/pdf-analysis/pdf-analysis-context";
import {
  requestAudioPermission,
  unlockSpeech,
} from "@/lib/speech";

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
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  const disabled = !narration || narration.segments.length === 0 || asking;

  async function withPermission(run: () => void) {
    setPermissionError(null);
    setAsking(true);
    unlockSpeech();
    try {
      const state = await requestAudioPermission();
      if (state === "denied") {
        setPermissionError(
          "Microphone permission is blocked. Allow mic access for this site in the browser address bar, then try again.",
        );
        return;
      }
      if (state === "unsupported") {
        setPermissionError(
          "This browser cannot request audio permission. Try Chrome or Edge on localhost/HTTPS.",
        );
        return;
      }
      run();
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            void withPermission(() => playNarration(null));
          }}
          className="rounded-full border border-border px-3 py-1.5 text-sm disabled:opacity-40"
        >
          {asking ? "Allow mic…" : "Play all"}
        </button>
        <button
          type="button"
          disabled={disabled || !selectedHighlightId}
          onClick={() => {
            void withPermission(() => playNarration(selectedHighlightId));
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
      <p className="text-[11px] text-muted-dim">
        First play asks for microphone permission so the browser allows voice
        features on this site.
      </p>
      {permissionError ? (
        <p className="text-xs text-danger">{permissionError}</p>
      ) : null}
      {narrationStatus === "unavailable" ? (
        <p className="text-xs text-danger">
          Browser speech returned synthesis-failed. Unmute this tab, fully quit
          and reopen Chrome/Edge, then try Play again.
        </p>
      ) : null}
    </div>
  );
}
