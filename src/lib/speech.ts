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

export function speakText(
  text: string,
  options?: { lang?: string; rate?: number },
): Promise<void> {
  if (!speechSynthesisSupported()) {
    return Promise.reject(new Error("Speech synthesis is not supported."));
  }

  return new Promise((resolve, reject) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options?.lang || navigator.language || "en-US";
    utterance.rate = options?.rate ?? 1;

    const voices = window.speechSynthesis.getVoices();
    const match =
      voices.find((voice) =>
        voice.lang.toLowerCase().startsWith(utterance.lang.toLowerCase()),
      ) ??
      voices.find((voice) =>
        voice.lang
          .toLowerCase()
          .startsWith(utterance.lang.slice(0, 2).toLowerCase()),
      );
    if (match) utterance.voice = match;

    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error("Speech synthesis failed."));
    window.speechSynthesis.speak(utterance);
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
  const chunks = chunkForSpeech(text);
  for (const chunk of chunks) {
    if (options?.signal?.aborted) {
      stopSpeaking();
      throw new DOMException("Aborted", "AbortError");
    }
    await speakText(chunk, { lang: options?.lang });
  }
}
