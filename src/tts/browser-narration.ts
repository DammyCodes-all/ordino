"use client";

import type { NarrationPlaylist, NarrationSegment } from "@/contracts";

export type NarrationStatus = "idle" | "playing" | "paused" | "unavailable";

export class BrowserNarrationPlayer {
  private queue: NarrationSegment[] = [];
  private index = 0;
  private status: NarrationStatus = "idle";
  private onStatus: ((status: NarrationStatus) => void) | null = null;

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

  play(playlist: NarrationPlaylist, fromHighlightId?: string | null) {
    if (!this.available) {
      this.setStatus("unavailable");
      return;
    }

    window.speechSynthesis.cancel();
    this.queue = [...playlist.segments].sort((a, b) => a.order - b.order);
    if (fromHighlightId) {
      const start = this.queue.findIndex(
        (segment) => segment.highlightId === fromHighlightId,
      );
      if (start >= 0) this.queue = this.queue.slice(start);
    }
    this.index = 0;
    if (this.queue.length === 0) {
      this.setStatus("idle");
      return;
    }
    this.speakNext(playlist.language);
  }

  private speakNext(language: string) {
    if (!this.available) {
      this.setStatus("unavailable");
      return;
    }
    const segment = this.queue[this.index];
    if (!segment) {
      this.setStatus("idle");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(segment.text);
    utterance.lang = language;
    utterance.onend = () => {
      this.index += 1;
      this.speakNext(language);
    };
    utterance.onerror = () => {
      this.setStatus("unavailable");
    };
    this.setStatus("playing");
    window.speechSynthesis.speak(utterance);
  }

  pause() {
    if (!this.available) return;
    window.speechSynthesis.pause();
    this.setStatus("paused");
  }

  resume() {
    if (!this.available) return;
    window.speechSynthesis.resume();
    this.setStatus("playing");
  }

  stop() {
    if (!this.available) return;
    window.speechSynthesis.cancel();
    this.queue = [];
    this.index = 0;
    this.setStatus("idle");
  }

  getStatus() {
    return this.status;
  }
}
