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
import { ReviewFindings } from "@/components/review/review-findings";
import { StatusPanel } from "@/components/status-panel/status-panel";
import { AppIcon } from "@/components/ui/app-icon";
import { GemmaVoicePanel } from "@/components/voice/gemma-voice-panel";

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
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
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
      className={`relative flex h-full min-h-0 min-w-0 flex-1 flex-col transition-[padding] duration-300 ease-out ${
        chatNarrow ? "lg:pr-[min(210mm,42vw)]" : ""
      }`}
    >
      <header className="flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-border-subtle px-4 pt-[max(0.5rem,var(--safe-top))] pb-3 sm:min-h-16 sm:gap-4 sm:px-6 sm:pt-0 sm:pb-0 md:px-8">
        <div className="min-w-0">
          <p className="brand-wordmark-solid truncate text-xl sm:text-2xl">
            ordino
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-dim sm:text-sm">
            {chatNarrow ? "Chat · preview open" : "Chat-only document studio"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {publishedPreview ? (
            <button
              type="button"
              onClick={() => setPreviewOpen(!previewOpen)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs transition-colors sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm ${
                previewOpen
                  ? "border-accent-dim bg-accent-soft text-accent"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              <AppIcon icon={SidebarRightIcon} size={16} />
              <span className="hidden xs:inline sm:inline">
                {previewOpen ? "Preview" : "Open preview"}
              </span>
            </button>
          ) : null}
          {turn.running ? (
            <button
              type="button"
              onClick={cancelTurn}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs text-muted transition-colors hover:border-danger hover:text-danger sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
            >
              <AppIcon icon={Cancel01Icon} size={16} />
              <span className="hidden sm:inline">Cancel</span>
            </button>
          ) : null}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 md:px-8">
        {empty ? (
          <div className="mx-auto flex min-h-[calc(100%-1rem)] max-w-2xl flex-col items-center justify-center gap-4 py-10 text-center animate-fade-up sm:gap-6 sm:py-16 md:py-20">
            <p className="brand-wordmark text-5xl sm:text-6xl md:text-7xl">
              ordino
            </p>
            <h1 className="max-w-xl text-2xl font-medium tracking-tight text-foreground sm:text-4xl md:text-5xl">
              What document should we create?
            </h1>
            <p className="max-w-md text-base leading-relaxed text-muted sm:text-lg">
              Prompt in chat. When a turn finishes, the preview opens beside you
              — and the outline stays in this thread.
            </p>
            <div className="mt-2 flex w-full max-w-lg flex-col gap-2 sm:mt-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
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
                  className="rounded-2xl border border-border bg-surface px-4 py-3 text-left text-sm text-muted transition-colors hover:border-accent-dim hover:text-foreground disabled:opacity-40 sm:rounded-full sm:px-5 sm:py-2.5"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div
            className={`mx-auto flex flex-col gap-5 py-6 sm:gap-8 sm:py-10 md:py-12 ${
              chatNarrow ? "max-w-none" : "max-w-2xl"
            }`}
          >
            {messages.map((message) => (
              <article
                key={message.id}
                className={`animate-fade-up ${
                  message.role === "user"
                    ? chatNarrow
                      ? "ml-4 sm:ml-8"
                      : "ml-6 sm:ml-12 md:ml-20"
                    : "mr-1 sm:mr-2"
                }`}
              >
                <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-dim sm:text-xs">
                  {message.role === "user" ? "You" : "Ordino"}
                </p>
                <div
                  className={`rounded-2xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap sm:rounded-3xl sm:px-5 sm:py-4 sm:text-base ${
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
              <div className="animate-fade-up rounded-2xl border border-border bg-surface/80 p-4 sm:rounded-3xl sm:p-6">
                <p className="mb-3 text-[11px] uppercase tracking-wider text-muted-dim sm:mb-4 sm:text-xs">
                  Ordino · workflow
                </p>
                <StatusPanel />
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 pt-3 pb-[calc(var(--mobile-nav-height)+var(--safe-bottom)+0.75rem)] sm:px-6 md:px-8 md:py-5 md:pb-5">
        <GemmaVoicePanel />
        <ReviewFindings />
        <ChatOutline />
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className={chatNarrow ? "w-full" : "mx-auto max-w-2xl"}
        >
          <ReferenceChips />
          {generationBlocked ? (
            <p className="mb-3 text-sm text-danger">
              Generation disabled until Google AI Studio health checks pass.
            </p>
          ) : null}
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-composer px-3 py-2.5 focus-within:border-accent sm:gap-3 sm:rounded-3xl sm:px-4 sm:py-3">
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
              className="mb-0.5 flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-40 sm:size-11"
            >
              <AppIcon
                icon={AttachmentIcon}
                size={20}
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
              className="max-h-[160px] min-h-[44px] flex-1 resize-none bg-transparent py-2 text-base leading-6 text-foreground outline-none placeholder:text-muted-dim disabled:opacity-50 sm:min-h-[48px] sm:py-2.5"
            />
            <button
              type="submit"
              disabled={actionsDisabled || generationBlocked || !draft.trim()}
              className="mb-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-30 sm:size-11"
              aria-label="Send"
            >
              <AppIcon icon={ArrowRight01Icon} size={18} title="Send" />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
