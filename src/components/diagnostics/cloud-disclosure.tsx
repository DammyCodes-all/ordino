"use client";

import { useSession } from "@/components/app-shell/session-context";

export function CloudDisclosure() {
  const {
    disclosureOpen,
    cloudDisclosureAccepted,
    setDisclosureOpen,
    acceptDisclosure,
  } = useSession();

  if (!disclosureOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cloud-disclosure-title"
        className="w-full max-w-lg rounded-t-3xl border border-border bg-surface-raised p-5 shadow-2xl animate-fade-up sm:rounded-3xl sm:p-8"
      >
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-dim sm:text-xs">
          Before you generate
        </p>
        <h2
          id="cloud-disclosure-title"
          className="mt-2 text-xl font-medium tracking-tight sm:mt-3 sm:text-2xl"
        >
          Cloud processing with Google AI Studio
        </h2>
        <div className="mt-4 max-h-[50dvh] space-y-3 overflow-y-auto text-sm leading-relaxed text-muted sm:mt-5 sm:max-h-none sm:space-y-4 sm:text-base">
          <p>
            Prompts, relevant reference images, and rasterized PDF pages are
            sent to Google AI Studio for planning, writing, and visual review.
          </p>
          <p>
            Document structure, local PDF rendering, and IndexedDB session
            recovery stay on this device. Generation and visual review require
            internet access and a server-side{" "}
            <code className="rounded-md bg-background px-1.5 py-1 font-mono text-xs text-accent sm:text-sm">
              GOOGLE_GENERATIVE_AI_API_KEY
            </code>{" "}
            (never a <code className="font-mono text-xs sm:text-sm">NEXT_PUBLIC_</code>{" "}
            key).
          </p>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 pb-[max(0.25rem,var(--safe-bottom))] sm:mt-8 sm:flex-row sm:gap-3 sm:pb-0">
          {cloudDisclosureAccepted ? (
            <button
              type="button"
              onClick={() => setDisclosureOpen(false)}
              className="flex-1 rounded-full border border-border px-4 py-3 text-sm text-muted hover:text-foreground"
            >
              Close
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setDisclosureOpen(false)}
              className="flex-1 rounded-full border border-border px-4 py-3 text-sm text-muted hover:text-foreground"
            >
              Not now
            </button>
          )}
          <button
            type="button"
            onClick={acceptDisclosure}
            className="flex-1 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
          >
            {cloudDisclosureAccepted ? "Acknowledged" : "I understand"}
          </button>
        </div>
      </div>
    </div>
  );
}
