"use client";

import type { NarrationPlaylist, NarrationSegment } from "@/contracts";
import { speakText, stopSpeaking, waitForVoices } from "@/lib/speech";

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

function speakNow(text: string, lang: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Clear any stuck/competing utterances from prior attempts.
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.volume = 1;
    utterance.rate = 1;

    const voices = window.speechSynthesis.getVoices();
    const lower = lang.toLowerCase();
    const match =
      voices.find((voice) => voice.lang.toLowerCase() === lower) ??
      voices.find((voice) =>
        voice.lang.toLowerCase().startsWith(lower.slice(0, 2)),
      ) ??
      voices.find((voice) => voice.default) ??
      null;
    // Prefer default engine voice when no match — assigning a bad voice
    // triggers synthesis-failed on Linux/Chromium.
    if (match) utterance.voice = match;

    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    utterance.onend = () => finish(() => resolve());
    utterance.onerror = (event) => {
      const error = (event as SpeechSynthesisErrorEvent).error;
      if (error === "canceled" || error === "interrupted") {
        finish(() => resolve());
        return;
      }
      finish(() => reject(new Error(error || "Speech failed")));
    };

    window.speechSynthesis.speak(utterance);
  });
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
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 4_000);
  }

  prepareFromUserGesture() {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.resume();
  }

  play(playlist: NarrationPlaylist, fromHighlightId?: string | null) {
    if (!this.available) {
      this.setStatus("unavailable");
      return;
    }

    this.prepareFromUserGesture();
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
    this.startKeepalive();

    const first = this.queue[0];
    if (!first) {
      this.setStatus("idle");
      return;
    }

    // First utterance must start in the click stack (no await before speak).
    void speakNow(first.text, this.language)
      .then(async () => {
        if (token !== this.runToken) return;
        this.index = 1;
        await this.runRemaining(token);
      })
      .catch(async (error) => {
        if (token !== this.runToken) return;
        // One retry without an explicit voice assignment.
        try {
          await new Promise((r) => setTimeout(r, 120));
          if (token !== this.runToken) return;
          window.speechSynthesis.cancel();
          await speakNow(first.text, "en-US");
          if (token !== this.runToken) return;
          this.index = 1;
          await this.runRemaining(token);
        } catch (retryError) {
          console.warn("Narration failed to start", error, retryError);
          this.clearKeepalive();
          this.setStatus("unavailable");
        }
      });
  }

  private async waitIfPaused() {
    while (this.paused) {
      this.pauseGate = new Promise<void>((resolve) => {
        this.resumePause = resolve;
      });
      await this.pauseGate;
    }
  }

  private async runRemaining(token: number) {
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
          console.warn("Narration segment failed", error);
        }

        if (token !== this.runToken) return;
        this.index += 1;
      }

      if (token === this.runToken) {
        this.clearKeepalive();
        this.setStatus("idle");
        this.queue = [];
        this.index = 0;
      }
    } catch (error) {
      if (token !== this.runToken) return;
      console.warn("Narration unavailable", error);
      this.clearKeepalive();
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
    this.clearKeepalive();
    stopSpeaking();
    this.queue = [];
    this.index = 0;
    this.setStatus("idle");
  }

  getStatus() {
    return this.status;
  }
}
