"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/components/app-shell/session-context";
import { ChatOutline } from "@/components/document-outline/chat-outline";
import { ReferenceChips } from "@/components/reference-images/reference-chips";
import { StatusPanel } from "@/components/status-panel/status-panel";

export function ChatPanel() {
  const {
    messages,
    turn,
    stageLabel,
    actionsDisabled,
    generationBlocked,
    cloudDisclosureAccepted,
    publishedPreview,
    previewOpen,
    setPreviewOpen,
    sendPrompt,
    cancelTurn,
    addReference,
  } = useSession();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: stageLabel/turn.running intentionally retrigger scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, turn.running, stageLabel]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: draft drives textarea autosize
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [draft]);

  const empty = messages.length === 0;
  const chatNarrow = previewOpen && publishedPreview;

  async function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    const text = draft;
    if (!text.trim() || actionsDisabled || generationBlocked) return;
    if (cloudDisclosureAccepted) {
      setDraft("");
    }
    await sendPrompt(text);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <section
      className={`relative flex h-full min-w-0 flex-col transition-[flex-basis,max-width] duration-300 ease-out ${
        chatNarrow
          ? "flex-none w-full md:w-[42%] md:min-w-[18rem] md:max-w-[28rem]"
          : "flex-1"
      }`}
    >
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border-subtle px-4 sm:px-5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium tracking-tight">Ordino</p>
          <p className="truncate text-xs text-muted-dim">
            {chatNarrow ? "Chat · preview open" : "Chat-only document studio"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {publishedPreview ? (
            <button
              type="button"
              onClick={() => setPreviewOpen(!previewOpen)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                previewOpen
                  ? "border-accent-dim bg-accent-soft text-accent"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {previewOpen ? "Preview" : "Open preview"}
            </button>
          ) : null}
          {turn.running ? (
            <button
              type="button"
              onClick={cancelTurn}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-danger hover:text-danger"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 sm:px-5">
        {empty ? (
          <div className="mx-auto flex min-h-[calc(100%-2rem)] max-w-2xl flex-col items-center justify-center gap-4 py-16 text-center animate-fade-up">
            <p className="text-[11px] uppercase tracking-[0.28em] text-muted-dim">
              Ordino
            </p>
            <h1
              className={`font-medium tracking-tight text-foreground ${
                chatNarrow ? "text-2xl" : "max-w-xl text-3xl sm:text-4xl"
              }`}
            >
              What document should we create?
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-muted">
              Prompt in chat. When a turn finishes, the preview opens beside you
              — Claude-style — and the outline stays in this thread.
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
          <div
            className={`mx-auto flex flex-col gap-6 py-8 ${
              chatNarrow ? "max-w-none" : "max-w-2xl"
            }`}
          >
            {messages.map((message) => (
              <article
                key={message.id}
                className={`animate-fade-up ${
                  message.role === "user"
                    ? chatNarrow
                      ? "ml-4"
                      : "ml-8 sm:ml-16"
                    : "mr-2"
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
              <div className="animate-fade-up rounded-2xl border border-border bg-surface/80 p-4">
                <p className="mb-3 text-[11px] uppercase tracking-wider text-muted-dim">
                  Ordino · workflow
                </p>
                <StatusPanel compact />
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border-subtle bg-background/80 px-3 py-3 backdrop-blur-md sm:px-5 sm:py-4">
        <ChatOutline />
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className={chatNarrow ? "w-full" : "mx-auto max-w-2xl"}
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
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                role="img"
              >
                <title>Attach reference image</title>
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
              disabled={actionsDisabled || generationBlocked || !draft.trim()}
              className="mb-1 flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background transition-opacity disabled:opacity-30"
              aria-label="Send"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                role="img"
              >
                <title>Send</title>
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
        </form>
      </div>
    </section>
  );
}
