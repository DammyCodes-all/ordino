"use client";

import {
  ArrowRight01Icon,
  AttachmentIcon,
  Cancel01Icon,
  SidebarRightIcon,
} from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/components/app-shell/session-context";
import { ChatOutline } from "@/components/document-outline/chat-outline";
import { ReferenceChips } from "@/components/reference-images/reference-chips";
import { StatusPanel } from "@/components/status-panel/status-panel";
import { AppIcon } from "@/components/ui/app-icon";

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
      className={`relative flex h-full min-w-0 flex-1 flex-col transition-[padding] duration-300 ease-out ${
        chatNarrow ? "md:pr-[calc(210mm+2.5rem)]" : ""
      }`}
    >
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border-subtle px-5 sm:px-6">
        <div className="min-w-0">
          <p className="brand-wordmark-solid truncate text-xl">ordino</p>
          <p className="truncate text-xs text-muted-dim">
            {chatNarrow ? "Chat · preview open" : "Chat-only document studio"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {publishedPreview ? (
            <button
              type="button"
              onClick={() => setPreviewOpen(!previewOpen)}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors ${
                previewOpen
                  ? "border-accent-dim bg-accent-soft text-accent"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              <AppIcon icon={SidebarRightIcon} size={15} />
              {previewOpen ? "Preview" : "Open preview"}
            </button>
          ) : null}
          {turn.running ? (
            <button
              type="button"
              onClick={cancelTurn}
              className="inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-sm text-muted transition-colors hover:border-danger hover:text-danger"
            >
              <AppIcon icon={Cancel01Icon} size={15} />
              Cancel
            </button>
          ) : null}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 sm:px-6">
        {empty ? (
          <div className="mx-auto flex min-h-[calc(100%-2rem)] max-w-2xl flex-col items-center justify-center gap-5 py-16 text-center animate-fade-up">
            <p className="brand-wordmark text-5xl sm:text-6xl">ordino</p>
            <h1 className="max-w-xl text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              What document should we create?
            </h1>
            <p className="max-w-md text-base leading-relaxed text-muted">
              Prompt in chat. When a turn finishes, the preview opens as a
              floating panel beside you — and the outline stays in this thread.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
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
                  className="rounded-full border border-border bg-surface px-4 py-2 text-left text-sm text-muted transition-colors hover:border-accent-dim hover:text-foreground disabled:opacity-40"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div
            className={`mx-auto flex flex-col gap-7 py-10 ${
              chatNarrow ? "max-w-none" : "max-w-2xl"
            }`}
          >
            {messages.map((message) => (
              <article
                key={message.id}
                className={`animate-fade-up ${
                  message.role === "user"
                    ? chatNarrow
                      ? "ml-6"
                      : "ml-10 sm:ml-16"
                    : "mr-2"
                }`}
              >
                <p className="mb-2 text-xs uppercase tracking-wider text-muted-dim">
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
              <div className="animate-fade-up rounded-2xl border border-border bg-surface/80 p-5">
                <p className="mb-3 text-xs uppercase tracking-wider text-muted-dim">
                  Ordino · workflow
                </p>
                <StatusPanel />
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border-subtle bg-background/85 px-5 py-4 backdrop-blur-md sm:px-6">
        <ChatOutline />
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className={chatNarrow ? "w-full" : "mx-auto max-w-2xl"}
        >
          <ReferenceChips />
          {generationBlocked ? (
            <p className="mb-2 text-sm text-danger">
              Generation disabled until Google AI Studio health checks pass.
            </p>
          ) : null}
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-composer px-3 py-2.5 focus-within:border-accent">
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
              className="mb-0.5 flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-40"
            >
              <AppIcon
                icon={AttachmentIcon}
                size={18}
                title="Attach reference image"
              />
            </button>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Ask Ordino to draft or revise…"
              disabled={actionsDisabled || generationBlocked}
              className="max-h-[180px] min-h-[42px] flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 text-foreground outline-none placeholder:text-muted-dim disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={actionsDisabled || generationBlocked || !draft.trim()}
              className="mb-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-30"
              aria-label="Send"
            >
              <AppIcon icon={ArrowRight01Icon} size={16} title="Send" />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
