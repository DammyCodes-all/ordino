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
      className={`flex size-10 items-center justify-center rounded-[0.95rem] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
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
    <aside className="flex w-[var(--rail-width)] shrink-0 flex-col items-center border-r border-border-subtle bg-surface/80 py-4 backdrop-blur-md">
      <div className="mb-5 flex flex-col items-center gap-2">
        <div className="flex size-10 items-center justify-center rounded-[1rem] bg-primary">
          <span className="font-display text-xs text-primary-foreground">
            or
          </span>
        </div>
        <span
          className={`size-2 rounded-full ${statusTone}`}
          title="Session status"
        />
      </div>

      <nav className="flex flex-1 flex-col items-center gap-1.5">
        <IconButton
          label="New document"
          onClick={newDocument}
          disabled={actionsDisabled}
        >
          <AppIcon icon={Add01Icon} title="New document" />
        </IconButton>

        <IconButton
          label="Toggle preview"
          onClick={() => setPreviewOpen(!previewOpen)}
          disabled={!publishedPreview}
          active={previewOpen && publishedPreview}
        >
          <AppIcon icon={SidebarRightIcon} title="Toggle preview" />
        </IconButton>

        <IconButton
          label="Cloud disclosure"
          onClick={() => setDisclosureOpen(true)}
          active={disclosureOpen || !cloudDisclosureAccepted}
        >
          <AppIcon icon={CloudIcon} title="Cloud disclosure" />
        </IconButton>

        <IconButton
          label="Diagnostics"
          onClick={() => setDiagnosticsOpen(!diagnosticsOpen)}
          active={diagnosticsOpen || generationBlocked}
        >
          <AppIcon icon={Alert02Icon} title="Diagnostics" />
        </IconButton>
      </nav>

      <div className="mb-3 flex flex-col items-center gap-1.5">
        <IconButton
          label={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          onClick={toggleTheme}
        >
          <AppIcon
            icon={theme === "dark" ? Sun03Icon : Moon02Icon}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          />
        </IconButton>
        <p className="brand-wordmark-solid rotate-180 text-[10px] tracking-[0.12em] [writing-mode:vertical-rl]">
          ordino
        </p>
      </div>
    </aside>
  );
}
