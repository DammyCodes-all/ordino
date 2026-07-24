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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cloud-disclosure-title"
        className="w-full max-w-md border border-border bg-surface-raised p-5 shadow-2xl animate-fade-up"
      >
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-dim">
          Before you generate
        </p>
        <h2
          id="cloud-disclosure-title"
          className="mt-1.5 text-lg font-medium tracking-tight"
        >
          Cloud processing with Google AI Studio
        </h2>
        <div className="mt-3 space-y-2.5 text-sm leading-relaxed text-muted">
          <p>
            Prompts, relevant reference images, and rasterized PDF pages are
            sent to Google AI Studio for planning, writing, and visual review.
          </p>
          <p>
            Document structure, local PDF rendering, and IndexedDB session
            recovery stay on this device. Generation and visual review require
            internet access and a server-side{" "}
            <code className="bg-background px-1 py-0.5 font-mono text-[11px] text-accent">
              GOOGLE_GENERATIVE_AI_API_KEY
            </code>{" "}
            (never a <code className="font-mono text-[11px]">NEXT_PUBLIC_</code>{" "}
            key).
          </p>
        </div>
        <div className="mt-5 flex gap-1.5">
          {cloudDisclosureAccepted ? (
            <button
              type="button"
              onClick={() => setDisclosureOpen(false)}
              className="flex-1 border border-border px-3 py-2 text-sm text-muted hover:text-foreground"
            >
              Close
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setDisclosureOpen(false)}
              className="flex-1 border border-border px-3 py-2 text-sm text-muted hover:text-foreground"
            >
              Not now
            </button>
          )}
          <button
            type="button"
            onClick={acceptDisclosure}
            className="flex-1 bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            {cloudDisclosureAccepted ? "Acknowledged" : "I understand"}
          </button>
        </div>
      </div>
    </div>
  );
}
