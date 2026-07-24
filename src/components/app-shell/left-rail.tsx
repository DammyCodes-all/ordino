"use client";

import {
  Alert02Icon,
  CloudIcon,
  SidebarRightIcon,
} from "@hugeicons/core-free-icons";
import { useSession } from "@/components/app-shell/session-context";
import { AppIcon } from "@/components/ui/app-icon";

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
      className={`flex size-12 items-center justify-center rounded-2xl transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-accent-soft text-accent"
          : "text-muted hover:bg-surface-hover hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function LeftRail() {
  const {
    turn,
    cloudDisclosureAccepted,
    generationBlocked,
    diagnosticsOpen,
    disclosureOpen,
    publishedPreview,
    previewOpen,
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
    <aside className="flex h-full w-[var(--rail-width)] shrink-0 flex-col items-center rounded-full bg-surface/55 py-6 backdrop-blur-[2px]">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary">
          <span className="font-display text-sm text-primary-foreground">
            or
          </span>
        </div>
        <span
          className={`size-2.5 rounded-full ${statusTone}`}
          title="Session status"
        />
      </div>

      <nav className="flex flex-1 flex-col items-center gap-3">
        <IconButton
          label="Toggle preview"
          onClick={() => setPreviewOpen(!previewOpen)}
          disabled={!publishedPreview}
          active={previewOpen && publishedPreview}
        >
          <AppIcon icon={SidebarRightIcon} size={20} title="Toggle preview" />
        </IconButton>
      </nav>

      <div className="mb-5 flex flex-col items-center gap-3">
        <p className="brand-wordmark-solid rotate-180 text-xs tracking-[0.16em] [writing-mode:vertical-rl]">
          ordino
        </p>
      </div>
    </aside>
  );
}
