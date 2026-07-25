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

export type AudioPermissionState =
  | "granted"
  | "denied"
  | "prompt"
  | "unsupported";

/**
 * Triggers the browser permission prompt for microphone/audio.
 * Call from a click handler. Stops tracks immediately after grant —
 * we only need the permission gesture for voice features.
 */
export async function requestAudioPermission(): Promise<AudioPermissionState> {
  if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return "unsupported";
  }

  try {
    if (navigator.permissions?.query) {
      try {
        const status = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });
        if (status.state === "granted") return "granted";
        if (status.state === "denied") return "denied";
      } catch {
        // permissions.query(microphone) is unsupported in some browsers
      }
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    for (const track of stream.getTracks()) {
      track.stop();
    }
    return "granted";
  } catch (error) {
    const name = error instanceof DOMException ? error.name : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return "denied";
    }
    return "denied";
  }
}

/** Chrome loads voices asynchronously; wait until at least one is available. */
export function waitForVoices(
  timeoutMs = 1500,
): Promise<SpeechSynthesisVoice[]> {
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
 * Unlocks speechSynthesis after async work in Chromium.
 */
export function unlockSpeech(): void {
  if (!speechSynthesisSupported()) return;
  try {
    window.speechSynthesis.resume();
    window.speechSynthesis.getVoices();
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

let activeAudio: HTMLAudioElement | null = null;
let unlockPlay: Promise<void> | null = null;

/** Call synchronously from a click so later Audio.play() is allowed. */
export function unlockMediaPlayback() {
  if (typeof window === "undefined") return;
  unlockSpeech();
  if (!activeAudio) {
    activeAudio = new Audio();
    activeAudio.preload = "auto";
  }
  // Valid tiny silent PCM WAV (keeps the element in a playable unlocked state).
  activeAudio.src =
    "data:audio/wav;base64,UklGRnoAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAACAgICAgICAgICAgICAgA==";
  unlockPlay = activeAudio
    .play()
    .then(() => undefined)
    .catch(() => undefined);
}

export function pauseMediaPlayback() {
  activeAudio?.pause();
  if (speechSynthesisSupported()) window.speechSynthesis.pause();
}

export function resumeMediaPlayback() {
  if (activeAudio && activeAudio.paused && activeAudio.src) {
    void activeAudio.play().catch(() => undefined);
  }
  if (speechSynthesisSupported()) window.speechSynthesis.resume();
}

export async function speakText(
  text: string,
  options?: { lang?: string; rate?: number; signal?: AbortSignal },
): Promise<void> {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return;

  if (options?.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  // Server WAV first — Chromium speechSynthesis returns synthesis-failed here.
  try {
    await speakWithServer(trimmed, options);
    return;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
  }

  if (speechSynthesisSupported()) {
    await speakWithBrowser(trimmed, options);
  } else {
    throw new Error("No speech playback method available.");
  }
}

async function speakWithServer(
  text: string,
  options?: { lang?: string; signal?: AbortSignal },
): Promise<void> {
  if (options?.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  // Finish any unlock play so we can swap the source cleanly.
  if (unlockPlay) {
    await unlockPlay.catch(() => undefined);
    unlockPlay = null;
  }

  const response = await fetch("/api/tts/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language: options?.lang }),
    signal: options?.signal,
  });
  if (!response.ok) {
    const json = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(json.message || `Server TTS failed (${response.status})`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  await new Promise<void>((resolve, reject) => {
    const audio = activeAudio ?? new Audio();
    activeAudio = audio;
    audio.pause();

    const cleanup = () => {
      URL.revokeObjectURL(url);
      options?.signal?.removeEventListener("abort", onAbort);
    };

    const onAbort = () => {
      audio.pause();
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };
    options?.signal?.addEventListener("abort", onAbort);

    audio.onended = () => {
      cleanup();
      resolve();
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error("Audio playback failed."));
    };

    const start = () => {
      void audio.play().catch((error) => {
        cleanup();
        reject(error instanceof Error ? error : new Error(String(error)));
      });
    };

    audio.onloadeddata = () => start();
    audio.src = url;
    audio.load();
  });
}

async function speakWithBrowser(
  text: string,
  options?: { lang?: string; rate?: number; signal?: AbortSignal },
): Promise<void> {
  const voices = await waitForVoices();
  if (options?.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  return new Promise((resolve, reject) => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options?.lang || navigator.language || "en-US";
    utterance.rate = options?.rate ?? 1;
    utterance.volume = 1;

    const match = pickVoice(voices, utterance.lang);
    if (match) utterance.voice = match;

    let settled = false;
    const keepalive = window.setInterval(() => {
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

    window.setTimeout(() => {
      if (
        !settled &&
        !window.speechSynthesis.speaking &&
        !window.speechSynthesis.pending
      ) {
        finish(() => reject(new Error("Speech engine did not start.")));
      }
    }, 2500);
  });
}

export function stopSpeaking() {
  if (speechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
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
