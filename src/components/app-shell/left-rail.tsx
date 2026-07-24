"use client";

import {
  Add01Icon,
  Alert02Icon,
  CloudIcon,
  Moon02Icon,
  SidebarRightIcon,
  Sun03Icon,
} from "@hugeicons/core-free-icons";
import { useSession } from "@/components/app-shell/session-context";
import { useTheme } from "@/components/theme/theme-provider";
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
    <aside className="flex w-[var(--rail-width)] shrink-0 flex-col items-center border-r border-border-subtle bg-surface/80 py-6 backdrop-blur-md">
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
          label="New document"
          onClick={newDocument}
          disabled={actionsDisabled}
        >
          <AppIcon icon={Add01Icon} size={20} title="New document" />
        </IconButton>

        <IconButton
          label="Toggle preview"
          onClick={() => setPreviewOpen(!previewOpen)}
          disabled={!publishedPreview}
          active={previewOpen && publishedPreview}
        >
          <AppIcon icon={SidebarRightIcon} size={20} title="Toggle preview" />
        </IconButton>

        <IconButton
          label="Cloud disclosure"
          onClick={() => setDisclosureOpen(true)}
          active={disclosureOpen || !cloudDisclosureAccepted}
        >
          <AppIcon icon={CloudIcon} size={20} title="Cloud disclosure" />
        </IconButton>

        <IconButton
          label="Diagnostics"
          onClick={() => setDiagnosticsOpen(!diagnosticsOpen)}
          active={diagnosticsOpen || generationBlocked}
        >
          <AppIcon icon={Alert02Icon} size={20} title="Diagnostics" />
        </IconButton>
      </nav>

      <div className="mb-5 flex flex-col items-center gap-3">
        <IconButton
          label={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          onClick={toggleTheme}
        >
          <AppIcon
            icon={theme === "dark" ? Sun03Icon : Moon02Icon}
            size={20}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          />
        </IconButton>
        <p className="brand-wordmark-solid rotate-180 text-xs tracking-[0.16em] [writing-mode:vertical-rl]">
          ordino
        </p>
      </div>
    </aside>
  );
}
