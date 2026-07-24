"use client";

import type { NarrationPlaylist, NarrationSegment } from "@/contracts";
import {
  speakText,
  stopSpeaking,
  unlockSpeech,
  waitForVoices,
} from "@/lib/speech";

export type NarrationStatus = "idle" | "playing" | "paused" | "unavailable";

function normalizeLang(language: string | null | undefined) {
  const raw = (language || "en-US").trim();
  if (!raw) return "en-US";
  if (raw.length === 2) {
    const map: Record<string, string> = {
      en: "en-US",
      es: "es-ES",
      fr: "fr-FR",
      de: "de-DE",
      pt: "pt-BR",
      it: "it-IT",
      ha: "ha-NG",
      yo: "yo-NG",
      ig: "ig-NG",
    };
    return map[raw.toLowerCase()] ?? `${raw}-${raw.toUpperCase()}`;
  }
  return raw;
}

export class BrowserNarrationPlayer {
  private queue: NarrationSegment[] = [];
  private index = 0;
  private status: NarrationStatus = "idle";
  private language = "en-US";
  private onStatus: ((status: NarrationStatus) => void) | null = null;
  private runToken = 0;
  private paused = false;
  private pauseGate: Promise<void> | null = null;
  private resumePause: (() => void) | null = null;

  constructor(onStatus?: (status: NarrationStatus) => void) {
    this.onStatus = onStatus ?? null;
  }

  get available() {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  private setStatus(status: NarrationStatus) {
    this.status = status;
    this.onStatus?.(status);
  }

  /** Call from a click handler before play() when possible. */
  prepareFromUserGesture() {
    unlockSpeech();
  }

  play(playlist: NarrationPlaylist, fromHighlightId?: string | null) {
    if (!this.available) {
      this.setStatus("unavailable");
      return;
    }

    unlockSpeech();
    stopSpeaking();
    this.paused = false;
    this.resumePause?.();
    this.resumePause = null;
    this.pauseGate = null;

    this.queue = [...playlist.segments]
      .filter((segment) => segment.text.trim().length > 0)
      .sort((a, b) => a.order - b.order);
    if (fromHighlightId) {
      const start = this.queue.findIndex(
        (segment) => segment.highlightId === fromHighlightId,
      );
      if (start >= 0) this.queue = this.queue.slice(start);
    }
    this.index = 0;
    this.language = normalizeLang(playlist.language);
    if (this.queue.length === 0) {
      this.setStatus("idle");
      return;
    }

    const token = ++this.runToken;
    this.setStatus("playing");
    void this.run(token);
  }

  private async waitIfPaused() {
    while (this.paused) {
      this.pauseGate = new Promise<void>((resolve) => {
        this.resumePause = resolve;
      });
      await this.pauseGate;
    }
  }

  private async run(token: number) {
    try {
      await waitForVoices();
      if (token !== this.runToken) return;

      while (this.index < this.queue.length) {
        if (token !== this.runToken) return;
        await this.waitIfPaused();
        if (token !== this.runToken) return;

        const segment = this.queue[this.index];
        if (!segment) break;

        try {
          await speakText(segment.text, { lang: this.language });
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          // Skip bad segment; keep going rather than marking whole player dead.
          console.warn("Narration segment failed", error);
        }

        if (token !== this.runToken) return;
        this.index += 1;
      }

      if (token === this.runToken) {
        this.setStatus("idle");
        this.queue = [];
        this.index = 0;
      }
    } catch (error) {
      if (token !== this.runToken) return;
      console.warn("Narration unavailable", error);
      this.setStatus("unavailable");
    }
  }

  pause() {
    if (!this.available || this.status !== "playing") return;
    this.paused = true;
    window.speechSynthesis.pause();
    this.setStatus("paused");
  }

  resume() {
    if (!this.available) return;
    this.paused = false;
    this.resumePause?.();
    this.resumePause = null;
    this.pauseGate = null;
    window.speechSynthesis.resume();
    if (this.status === "paused") this.setStatus("playing");
  }

  stop() {
    this.runToken += 1;
    this.paused = false;
    this.resumePause?.();
    this.resumePause = null;
    this.pauseGate = null;
    stopSpeaking();
    this.queue = [];
    this.index = 0;
    this.setStatus("idle");
  }

  getStatus() {
    return this.status;
  }
}
