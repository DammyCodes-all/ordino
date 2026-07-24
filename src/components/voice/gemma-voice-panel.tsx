"use client";

import {
  Cancel01Icon,
  Mic01Icon,
  PauseIcon,
  PlayIcon,
  VolumeHighIcon,
} from "@hugeicons/core-free-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "@/components/app-shell/session-context";
import { AppIcon } from "@/components/ui/app-icon";
import { documentToSpokenText } from "@/lib/document-text";
import {
  listenOnce,
  requestAudioPermission,
  speakLongText,
  speechRecognitionSupported,
  speechSynthesisSupported,
  stopSpeaking,
  unlockMediaPlayback,
} from "@/lib/speech";

type VoiceTurn = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type VoiceReply = {
  reply: string;
  languageCode: string;
  languageName: string;
};

export function GemmaVoicePanel() {
  const { document, publishedPreview, turn } = useSession();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [languageCode, setLanguageCode] = useState(
    () => (typeof navigator !== "undefined" && navigator.language) || "en-US",
  );
  const [languageName, setLanguageName] = useState("Auto");
  const [turns, setTurns] = useState<VoiceTurn[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const documentText = useMemo(
    () => documentToSpokenText(document),
    [document],
  );

  const canUse =
    publishedPreview &&
    !turn.running &&
    document.nodes.length > 0 &&
    documentText.length > 0;

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      stopSpeaking();
    };
  }, []);

  if (!canUse) return null;

  async function callVoiceApi(payload: Record<string, unknown>) {
    const response = await fetch("/api/ai/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: abortRef.current?.signal,
    });
    if (!response.ok) {
      const json = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      throw new Error(json.message || `Voice API failed (${response.status})`);
    }
    return (await response.json()) as VoiceReply;
  }

  async function withSpeech<T>(
    run: () => Promise<T>,
    opts?: { requireMic?: boolean },
  ) {
    setError(null);
    setBusy(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      if (opts?.requireMic) {
        const permission = await requestAudioPermission();
        if (permission === "denied") {
          throw new Error(
            "Microphone permission denied. Allow mic in the address bar, then try again.",
          );
        }
        if (permission === "unsupported") {
          throw new Error(
            "This browser cannot request microphone permission. Use Chrome or Edge.",
          );
        }
      }
      return await run();
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setError(err instanceof Error ? err.message : String(err));
      }
      return null;
    } finally {
      setBusy(false);
      setListening(false);
      setSpeaking(false);
      abortRef.current = null;
    }
  }

  async function handleIntroAndOpen() {
    unlockMediaPlayback();
    setOpen(true);
    await withSpeech(async () => {
      const data = await callVoiceApi({
        mode: "intro",
        documentText,
        documentTitle: document.meta.title,
        preferredLanguage: languageCode,
        conversation: [],
      });
      setLanguageCode(data.languageCode);
      setLanguageName(data.languageName);
      setTurns([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: data.reply,
        },
      ]);
      setSpeaking(true);
      await speakLongText(data.reply, {
        lang: data.languageCode,
        signal: abortRef.current?.signal,
      });
    });
  }

  async function handleReadAloud() {
    unlockMediaPlayback();
    await withSpeech(async () => {
      setSpeaking(true);
      const preface =
        languageName === "Auto" ? "I'll read the document now." : undefined;
      if (preface) {
        await speakLongText(preface, {
          lang: languageCode,
          signal: abortRef.current?.signal,
        });
      }
      await speakLongText(documentText, {
        lang: languageCode,
        signal: abortRef.current?.signal,
      });
    });
  }

  async function handleTalk() {
    unlockMediaPlayback();
    if (!speechRecognitionSupported()) {
      setError(
        "Microphone speech recognition needs Chrome or Edge over HTTPS/localhost.",
      );
      return;
    }
    await withSpeech(async () => {
      setListening(true);
      const heard = await listenOnce({
        lang: languageCode,
        signal: abortRef.current?.signal,
      });
      setListening(false);

      const userTurn: VoiceTurn = {
        id: crypto.randomUUID(),
        role: "user",
        text: heard.transcript,
      };
      setTurns((prev) => [...prev, userTurn]);

      const data = await callVoiceApi({
        mode: "chat",
        userMessage: heard.transcript,
        documentText,
        documentTitle: document.meta.title,
        preferredLanguage: languageCode,
        conversation: [...turns, userTurn].map((turnItem) => ({
          role: turnItem.role,
          text: turnItem.text,
        })),
      });

      setLanguageCode(data.languageCode);
      setLanguageName(data.languageName);
      const assistantTurn: VoiceTurn = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: data.reply,
      };
      setTurns((prev) => [...prev, assistantTurn]);

      setSpeaking(true);
      await speakLongText(data.reply, {
        lang: data.languageCode,
        signal: abortRef.current?.signal,
      });
    }, { requireMic: true });
  }

  function handleStop() {
    abortRef.current?.abort();
    stopSpeaking();
    setListening(false);
    setSpeaking(false);
    setBusy(false);
  }

  return (
    <div className="mx-auto mb-3 w-full max-w-2xl animate-fade-up">
      {!open ? (
        <button
          type="button"
          onClick={() => void handleIntroAndOpen()}
          className="flex w-full items-center justify-between gap-3 border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:bg-surface-hover"
        >
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-dim">
              After PDF
            </p>
            <p className="text-sm font-medium text-foreground">
              Talk with Gemma
            </p>
            <p className="text-xs text-muted">
              Hear the document aloud, then speak in any language — Gemma
              replies in the language you used.
            </p>
          </div>
          <span className="flex size-9 shrink-0 items-center justify-center bg-primary text-primary-foreground">
            <AppIcon icon={Mic01Icon} size={18} />
          </span>
        </button>
      ) : (
        <div className="border border-border bg-surface">
          <div className="flex items-start justify-between gap-2 border-b border-border-subtle px-3 py-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-dim">
                Gemma · voice
              </p>
              <p className="text-sm font-medium">
                {languageName === "Auto"
                  ? "Listening language follows you"
                  : `Replying in ${languageName}`}
              </p>
              <p className="text-[11px] text-muted-dim">{languageCode}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                handleStop();
                setOpen(false);
              }}
              className="flex size-8 items-center justify-center text-muted hover:bg-surface-hover hover:text-foreground"
              aria-label="Close Gemma voice"
            >
              <AppIcon icon={Cancel01Icon} size={16} />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 border-b border-border-subtle px-3 py-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleReadAloud()}
              className="inline-flex items-center gap-1.5 border border-border bg-primary px-2.5 py-1.5 text-xs text-primary-foreground disabled:opacity-40"
            >
              <AppIcon icon={VolumeHighIcon} size={14} />
              Read PDF aloud
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleTalk()}
              className="inline-flex items-center gap-1.5 border border-border px-2.5 py-1.5 text-xs text-foreground disabled:opacity-40"
            >
              <AppIcon icon={listening ? PauseIcon : Mic01Icon} size={14} />
              {listening ? "Listening…" : "Speak to Gemma"}
            </button>
            {busy || speaking ? (
              <button
                type="button"
                onClick={handleStop}
                className="inline-flex items-center gap-1.5 border border-border px-2.5 py-1.5 text-xs text-danger"
              >
                <AppIcon icon={Cancel01Icon} size={14} />
                Stop
              </button>
            ) : null}
          </div>

          <div className="max-h-48 space-y-2 overflow-y-auto px-3 py-2">
            {turns.length === 0 ? (
              <p className="text-xs text-muted-dim">
                Gemma can narrate the PDF, then answer spoken questions in your
                language.
              </p>
            ) : (
              turns.map((turnItem) => (
                <div key={turnItem.id} className="text-xs leading-relaxed">
                  <p className="text-[10px] uppercase tracking-wider text-muted-dim">
                    {turnItem.role === "user" ? "You" : "Gemma"}
                  </p>
                  <p className="text-foreground/90">{turnItem.text}</p>
                </div>
              ))
            )}
          </div>

          {error ? (
            <p className="border-t border-border-subtle px-3 py-2 text-xs text-danger">
              {error}
            </p>
          ) : null}

          {speaking ? (
            <p className="border-t border-border-subtle px-3 py-1.5 text-[11px] text-accent animate-pulse-soft">
              <AppIcon icon={PlayIcon} size={12} className="mr-1 inline" />
              Speaking…
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
