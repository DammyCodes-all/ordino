"use client";

import { useSession } from "@/components/app-shell/session-context";
import { useTheme } from "@/components/theme/theme-provider";

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
      className={`flex size-9 items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
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
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" role="img">
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
  const { theme, toggleTheme } = useTheme();

  const statusTone = generationBlocked
    ? "bg-danger"
    : turn.running
      ? "bg-warning animate-pulse-soft"
      : "bg-success";

  return (
    <aside className="flex w-[var(--rail-width)] shrink-0 flex-col items-center border-r border-border-subtle bg-surface py-3">
      <div className="mb-4 flex flex-col items-center gap-1.5">
        <div className="flex size-9 items-center justify-center bg-primary">
          <span className="font-display text-[11px] text-primary-foreground">
            or
          </span>
        </div>
        <span
          className={`size-1.5 rounded-full ${statusTone}`}
          title="Session status"
        />
      </div>

      <nav className="flex flex-1 flex-col items-center gap-0.5">
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

      <div className="mb-3 flex flex-col items-center gap-1.5">
        <IconButton
          label={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          onClick={toggleTheme}
        >
          {theme === "dark" ? (
            <RailIcon
              title="Light mode"
              path={
                <>
                  <circle
                    cx="12"
                    cy="12"
                    r="4"
                    stroke="currentColor"
                    strokeWidth="1.75"
                  />
                  <path
                    d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </>
              }
            />
          ) : (
            <RailIcon
              title="Dark mode"
              path={
                <path
                  d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5Z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                />
              }
            />
          )}
        </IconButton>
        <p className="brand-wordmark-solid rotate-180 text-[10px] tracking-[0.12em] [writing-mode:vertical-rl]">
          ordino
        </p>
      </div>
    </aside>
  );
}
