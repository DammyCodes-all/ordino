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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cloud-disclosure-title"
        className="w-full max-w-lg rounded-3xl border border-border bg-surface-raised p-8 shadow-2xl animate-fade-up"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-muted-dim">
          Before you generate
        </p>
        <h2
          id="cloud-disclosure-title"
          className="mt-3 text-2xl font-medium tracking-tight"
        >
          Cloud processing with Google AI Studio
        </h2>
        <div className="mt-5 space-y-4 text-base leading-relaxed text-muted">
          <p>
            Prompts, relevant reference images, and rasterized PDF pages are
            sent to Google AI Studio for planning, writing, and visual review.
          </p>
          <p>
            Document structure, local PDF rendering, and IndexedDB session
            recovery stay on this device. Generation and visual review require
            internet access and a server-side{" "}
            <code className="rounded-md bg-background px-1.5 py-1 font-mono text-sm text-accent">
              GOOGLE_GENERATIVE_AI_API_KEY
            </code>{" "}
            (never a <code className="font-mono text-sm">NEXT_PUBLIC_</code>{" "}
            key).
          </p>
        </div>
        <div className="mt-8 flex gap-3">
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
