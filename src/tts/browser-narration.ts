"use client";

import type { NarrationPlaylist, NarrationSegment } from "@/contracts";
import { unlockSpeech, waitForVoices } from "@/lib/speech";

export type NarrationStatus = "idle" | "playing" | "paused" | "unavailable";

export class BrowserNarrationPlayer {
  private queue: NarrationSegment[] = [];
  private index = 0;
  private status: NarrationStatus = "idle";
  private language = "en";
  private onStatus: ((status: NarrationStatus) => void) | null = null;
  private keepalive: ReturnType<typeof setInterval> | null = null;

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

  private clearKeepalive() {
    if (this.keepalive) {
      clearInterval(this.keepalive);
      this.keepalive = null;
    }
  }

  private startKeepalive() {
    this.clearKeepalive();
    this.keepalive = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.resume();
      }
    }, 5_000);
  }

  play(playlist: NarrationPlaylist, fromHighlightId?: string | null) {
    if (!this.available) {
      this.setStatus("unavailable");
      return;
    }

    unlockSpeech();
    window.speechSynthesis.cancel();
    this.queue = [...playlist.segments].sort((a, b) => a.order - b.order);
    if (fromHighlightId) {
      const start = this.queue.findIndex(
        (segment) => segment.highlightId === fromHighlightId,
      );
      if (start >= 0) this.queue = this.queue.slice(start);
    }
    this.index = 0;
    this.language = playlist.language || "en";
    if (this.queue.length === 0) {
      this.setStatus("idle");
      return;
    }

    void waitForVoices().then(() => {
      this.startKeepalive();
      this.speakNext(this.language);
    });
  }

  private speakNext(language: string) {
    if (!this.available) {
      this.clearKeepalive();
      this.setStatus("unavailable");
      return;
    }
    const segment = this.queue[this.index];
    if (!segment) {
      this.clearKeepalive();
      this.setStatus("idle");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(segment.text);
    utterance.lang = language;
    utterance.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const lower = language.toLowerCase();
    const match =
      voices.find((voice) => voice.lang.toLowerCase().startsWith(lower)) ??
      voices.find((voice) =>
        voice.lang.toLowerCase().startsWith(lower.slice(0, 2)),
      );
    if (match) utterance.voice = match;

    utterance.onend = () => {
      this.index += 1;
      this.speakNext(language);
    };
    utterance.onerror = (event) => {
      const error = (event as SpeechSynthesisErrorEvent).error;
      if (error === "canceled" || error === "interrupted") {
        return;
      }
      this.clearKeepalive();
      this.setStatus("unavailable");
    };
    this.setStatus("playing");
    window.speechSynthesis.resume();
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
    this.clearKeepalive();
    window.speechSynthesis.cancel();
    this.queue = [];
    this.index = 0;
    this.setStatus("idle");
  }

  getStatus() {
    return this.status;
  }
}
