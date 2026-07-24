"use client";

import type { NarrationPlaylist, NarrationSegment } from "@/contracts";
import { speakText, stopSpeaking } from "@/lib/speech";

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
  private abort: AbortController | null = null;

  constructor(onStatus?: (status: NarrationStatus) => void) {
    this.onStatus = onStatus ?? null;
  }

  get available() {
    return typeof window !== "undefined";
  }

  private setStatus(status: NarrationStatus) {
    this.status = status;
    this.onStatus?.(status);
  }

  prepareFromUserGesture() {
    // Kept for call-site compatibility (mic permission / unlock happen in UI).
  }

  play(playlist: NarrationPlaylist, fromHighlightId?: string | null) {
    this.stop();

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
    this.abort = new AbortController();
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
      while (this.index < this.queue.length) {
        if (token !== this.runToken) return;
        await this.waitIfPaused();
        if (token !== this.runToken) return;

        const segment = this.queue[this.index];
        if (!segment) break;

        await speakText(segment.text, {
          lang: this.language,
          signal: this.abort?.signal,
        });

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
      if (error instanceof DOMException && error.name === "AbortError") {
        this.setStatus("idle");
        return;
      }
      console.warn("Narration unavailable", error);
      this.setStatus("unavailable");
    }
  }

  pause() {
    if (this.status !== "playing") return;
    this.paused = true;
    // Pause browser synthesis if active; server audio continues per-segment.
    if ("speechSynthesis" in window) window.speechSynthesis.pause();
    this.setStatus("paused");
  }

  resume() {
    this.paused = false;
    this.resumePause?.();
    this.resumePause = null;
    this.pauseGate = null;
    if ("speechSynthesis" in window) window.speechSynthesis.resume();
    if (this.status === "paused") this.setStatus("playing");
  }

  stop() {
    this.runToken += 1;
    this.paused = false;
    this.resumePause?.();
    this.resumePause = null;
    this.pauseGate = null;
    this.abort?.abort();
    this.abort = null;
    stopSpeaking();
    this.queue = [];
    this.index = 0;
    this.setStatus("idle");
  }

  getStatus() {
    return this.status;
  }
}
