"use client";

import { useSession } from "@/components/app-shell/session-context";

function IconButton({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex size-10 items-center justify-center rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-accent-soft text-accent"
          : "text-muted hover:bg-surface-hover hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function RailIcon({ title, path }: { title: string; path: React.ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" role="img">
      <title>{title}</title>
      {path}
    </svg>
  );
}

export function LeftRail() {
  const {
    actionsDisabled,
    turn,
    cloudDisclosureAccepted,
    generationBlocked,
    diagnosticsOpen,
    disclosureOpen,
    publishedPreview,
    previewOpen,
    newDocument,
    setDisclosureOpen,
    setDiagnosticsOpen,
    setPreviewOpen,
  } = useSession();

  const statusTone = generationBlocked
    ? "bg-danger"
    : turn.running
      ? "bg-warning animate-pulse-soft"
      : "bg-success";

  return (
    <aside className="flex w-[var(--rail-width)] shrink-0 flex-col items-center border-r border-border-subtle bg-surface py-4">
      <div className="mb-6 flex flex-col items-center gap-2">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-accent-soft text-sm font-semibold tracking-tight text-accent">
          Or
        </div>
        <span
          className={`size-2 rounded-full ${statusTone}`}
          title="Session status"
        />
      </div>

      <nav className="flex flex-1 flex-col items-center gap-1">
        <IconButton
          label="New document"
          onClick={newDocument}
          disabled={actionsDisabled}
        >
          <RailIcon
            title="New document"
            path={
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            }
          />
        </IconButton>

        <IconButton
          label="Toggle preview"
          onClick={() => setPreviewOpen(!previewOpen)}
          disabled={!publishedPreview}
          active={previewOpen && publishedPreview}
        >
          <RailIcon
            title="Toggle preview"
            path={
              <path
                d="M14 4h5v16h-5M5 4h7v16H5z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
              />
            }
          />
        </IconButton>

        <IconButton
          label="Cloud disclosure"
          onClick={() => setDisclosureOpen(true)}
          active={disclosureOpen || !cloudDisclosureAccepted}
        >
          <RailIcon
            title="Cloud disclosure"
            path={
              <path
                d="M7 18h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.7-1.5A3.5 3.5 0 0 0 7 18Z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
              />
            }
          />
        </IconButton>

        <IconButton
          label="Diagnostics"
          onClick={() => setDiagnosticsOpen(!diagnosticsOpen)}
          active={diagnosticsOpen || generationBlocked}
        >
          <RailIcon
            title="Diagnostics"
            path={
              <path
                d="M12 8v4m0 4h.01M10.3 4.3 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            }
          />
        </IconButton>
      </nav>

      <p className="rotate-180 text-[10px] tracking-[0.2em] text-muted-dim [writing-mode:vertical-rl]">
        ORDINO
      </p>
    </aside>
  );
}
