"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/components/app-shell/session-context";
import { ReferenceChips } from "@/components/reference-images/reference-chips";

export function ChatPanel() {
  const {
    messages,
    turn,
    stageLabel,
    actionsDisabled,
    generationBlocked,
    sendPrompt,
    cancelTurn,
    addReference,
  } = useSession();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, turn.running, stageLabel]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [draft]);

  const empty = messages.length === 0;

  async function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    const text = draft;
    if (!text.trim() || actionsDisabled || generationBlocked) return;
    setDraft("");
    await sendPrompt(text);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <section className="relative flex min-w-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border-subtle px-6">
        <div>
          <p className="text-sm font-medium tracking-tight">Ordino</p>
          <p className="text-xs text-muted-dim">Chat-only document studio</p>
        </div>
        {turn.running ? (
          <button
            type="button"
            onClick={cancelTurn}
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-danger hover:text-danger"
          >
            Cancel
          </button>
        ) : null}
      </header>

      <div className="flex-1 overflow-y-auto px-4 sm:px-8">
        {empty ? (
          <div className="mx-auto flex min-h-[calc(100%-2rem)] max-w-2xl flex-col items-center justify-center gap-4 py-16 text-center animate-fade-up">
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted-dim">
              Ordino
            </p>
            <h1 className="max-w-xl text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              What document should we create?
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-muted">
              Describe the brief in chat. Ordino plans, writes, reviews layout,
              and publishes a PDF preview when the turn finishes.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {[
                "One-page product brief for investors",
                "Formal meeting agenda with table",
                "Concise policy memo for leadership",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={actionsDisabled || generationBlocked}
                  onClick={() => setDraft(suggestion)}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-left text-xs text-muted transition-colors hover:border-accent-dim hover:text-foreground disabled:opacity-40"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-6 py-8">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`animate-fade-up ${
                  message.role === "user" ? "ml-8 sm:ml-16" : "mr-4"
                }`}
              >
                <p className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-dim">
                  {message.role === "user" ? "You" : "Ordino"}
                </p>
                <div
                  className={`rounded-2xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap ${
                    message.role === "user"
                      ? "bg-surface-raised text-foreground"
                      : "bg-transparent text-foreground/95"
                  }`}
                >
                  {message.text}
                </div>
              </article>
            ))}
            {turn.running ? (
              <div className="flex items-center gap-2 text-sm text-muted animate-fade-up">
                <span className="size-1.5 rounded-full bg-accent animate-pulse-soft" />
                {stageLabel}…
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border-subtle bg-background/80 px-4 py-4 backdrop-blur-md sm:px-8">
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="mx-auto max-w-2xl"
        >
          <ReferenceChips />
          {generationBlocked ? (
            <p className="mb-2 text-xs text-danger">
              Generation disabled until Google AI Studio health checks pass.
            </p>
          ) : null}
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-composer px-3 py-2 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] focus-within:border-accent-dim">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void addReference(file);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              title="Attach reference image"
              disabled={actionsDisabled}
              onClick={() => fileRef.current?.click()}
              className="mb-1 flex size-9 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-40"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M21 12.5V18a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h5.5M16 3h5v5M14 10l7-7"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Ask Ordino to draft or revise…"
              disabled={actionsDisabled || generationBlocked}
              className="max-h-[180px] min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 text-foreground outline-none placeholder:text-muted-dim disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={
                actionsDisabled || generationBlocked || !draft.trim()
              }
              className="mb-1 flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background transition-opacity disabled:opacity-30"
              aria-label="Send"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-dim">
            Enter to send · Shift+Enter for newline · References stay local until
            a turn runs
          </p>
        </form>
      </div>
    </section>
  );
}
