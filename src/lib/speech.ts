"use client";

export type SpeechRecognitionResultLike = {
  transcript: string;
  confidence: number;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechRecognitionSupported() {
  return getRecognitionCtor() !== null;
}

export function speechSynthesisSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Chrome loads voices asynchronously; wait until at least one is available. */
export function waitForVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  if (!speechSynthesisSupported()) return Promise.resolve([]);

  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const done = () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.clearTimeout(timer);
      resolve(window.speechSynthesis.getVoices());
    };
    const timer = window.setTimeout(done, timeoutMs);
    window.speechSynthesis.onvoiceschanged = done;
    // Some engines need a kick.
    window.speechSynthesis.getVoices();
  });
}

/**
 * Call synchronously from a click/tap handler before any await.
 * Unlocks speechSynthesis after async work (API calls) in Chromium.
 */
export function unlockSpeech(): void {
  if (!speechSynthesisSupported()) return;
  try {
    window.speechSynthesis.resume();
    // Prime the voice list.
    window.speechSynthesis.getVoices();
    // Speak a near-silent token in the user gesture; do not cancel it.
    const warm = new SpeechSynthesisUtterance(".");
    warm.volume = 0.01;
    warm.rate = 2;
    warm.pitch = 1;
    warm.onend = () => undefined;
    warm.onerror = () => undefined;
    window.speechSynthesis.speak(warm);
  } catch {
    // ignore
  }
}

function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: string,
): SpeechSynthesisVoice | null {
  const lower = lang.toLowerCase();
  const base = lower.slice(0, 2);
  return (
    voices.find((voice) => voice.lang.toLowerCase() === lower) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(lower)) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(base)) ??
    voices.find((voice) => voice.default) ??
    voices[0] ??
    null
  );
}

export function listenOnce(options?: {
  lang?: string;
  signal?: AbortSignal;
}): Promise<SpeechRecognitionResultLike> {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    return Promise.reject(new Error("Speech recognition is not supported."));
  }

  return new Promise((resolve, reject) => {
    const recognition = new Ctor();
    recognition.lang = options?.lang || navigator.language || "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const onAbort = () => {
      recognition.abort();
      reject(new DOMException("Aborted", "AbortError"));
    };
    options?.signal?.addEventListener("abort", onAbort, { once: true });

    recognition.onresult = (event) => {
      const result = event.results?.[0]?.[0];
      if (!result?.transcript) {
        reject(new Error("No speech detected."));
        return;
      }
      resolve({
        transcript: String(result.transcript),
        confidence: Number(result.confidence ?? 0),
      });
    };
    recognition.onerror = (event) => {
      reject(new Error(event.error || "Speech recognition failed."));
    };
    recognition.onend = () => {
      options?.signal?.removeEventListener("abort", onAbort);
    };

    recognition.start();
  });
}

export async function speakText(
  text: string,
  options?: { lang?: string; rate?: number; signal?: AbortSignal },
): Promise<void> {
  if (!speechSynthesisSupported()) {
    return Promise.reject(new Error("Speech synthesis is not supported."));
  }

  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return;

  if (options?.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const voices = await waitForVoices();
  if (options?.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  return new Promise((resolve, reject) => {
    // Avoid stacking on a stuck queue from a prior cancel.
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const utterance = new SpeechSynthesisUtterance(trimmed);
    utterance.lang = options?.lang || navigator.language || "en-US";
    utterance.rate = options?.rate ?? 1;
    utterance.volume = 1;

    const match = pickVoice(voices, utterance.lang);
    if (match) utterance.voice = match;

    let settled = false;
    const keepalive = window.setInterval(() => {
      // Chromium pauses synthesis after ~15s unless resumed.
      if (window.speechSynthesis.paused || window.speechSynthesis.speaking) {
        window.speechSynthesis.resume();
      }
    }, 4_000);

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.clearInterval(keepalive);
      options?.signal?.removeEventListener("abort", onAbort);
      fn();
    };

    const onAbort = () => {
      window.speechSynthesis.cancel();
      finish(() => reject(new DOMException("Aborted", "AbortError")));
    };
    options?.signal?.addEventListener("abort", onAbort);

    utterance.onend = () => finish(() => resolve());
    utterance.onerror = (event) => {
      const error = (event as SpeechSynthesisErrorEvent).error;
      if (error === "canceled" || error === "interrupted") {
        finish(() => resolve());
        return;
      }
      finish(() => reject(new Error(error || "Speech synthesis failed.")));
    };

    window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);

    // Watchdog: if the engine never starts, fail clearly instead of hanging.
    window.setTimeout(() => {
      if (
        !settled &&
        !window.speechSynthesis.speaking &&
        !window.speechSynthesis.pending
      ) {
        finish(() =>
          reject(
            new Error(
              "Speech engine did not start. Install system voices (e.g. speech-dispatcher / espeak) or try Chrome.",
            ),
          ),
        );
      }
    }, 2500);
  });
}

export function stopSpeaking() {
  if (speechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

/** Split long scripts into speakable chunks. */
export function chunkForSpeech(text: string, maxChars = 450): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxChars) return [cleaned];

  const chunks: string[] = [];
  let remaining = cleaned;
  while (remaining.length > maxChars) {
    let cut = remaining.lastIndexOf(". ", maxChars);
    if (cut < maxChars * 0.4) cut = remaining.lastIndexOf(" ", maxChars);
    if (cut < 1) cut = maxChars;
    chunks.push(remaining.slice(0, cut + 1).trim());
    remaining = remaining.slice(cut + 1).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

export async function speakLongText(
  text: string,
  options?: { lang?: string; signal?: AbortSignal },
) {
  // Ensure voices are ready once up front.
  await waitForVoices();
  const chunks = chunkForSpeech(text);
  for (const chunk of chunks) {
    if (options?.signal?.aborted) {
      stopSpeaking();
      throw new DOMException("Aborted", "AbortError");
    }
    await speakText(chunk, {
      lang: options?.lang,
      signal: options?.signal,
    });
  }
}
