"use client";

import {
  BubbleChatIcon,
  File01Icon,
  SidebarRightIcon,
} from "@hugeicons/core-free-icons";
import { useSession } from "@/components/app-shell/session-context";
import { usePdfAnalysis } from "@/components/pdf-analysis/pdf-analysis-context";
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
      className={`flex size-11 items-center justify-center rounded-2xl transition-colors disabled:cursor-not-allowed disabled:opacity-40 md:size-12 ${
        active
          ? "bg-accent-soft text-accent"
          : "text-muted hover:bg-surface-hover hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function LeftRail({
  historyOpen,
  onToggleHistory,
}: {
  historyOpen: boolean;
  onToggleHistory: () => void;
}) {
  const {
    turn,
    generationBlocked,
    publishedPreview,
    previewOpen,
    setPreviewOpen,
  } = useSession();
  const { open: analysisOpen, setOpen: setAnalysisOpen } = usePdfAnalysis();

  const statusTone = generationBlocked
    ? "bg-danger"
    : turn.running
      ? "bg-warning animate-pulse-soft"
      : "bg-success";

  return (
    <aside
      className={[
        // Mobile: fixed bottom bar
        "fixed inset-x-0 bottom-0 z-40 flex items-center justify-around gap-1 border-t border-border-subtle bg-surface/90 px-2 pt-2 backdrop-blur-md",
        "pb-[max(0.5rem,var(--safe-bottom))]",
        // Desktop: floating vertical pill
        "md:static md:inset-auto md:z-auto md:h-full md:w-[var(--rail-width)] md:shrink-0 md:flex-col md:justify-start md:gap-0 md:rounded-full md:border-0 md:bg-surface/55 md:px-0 md:py-6 md:pb-6 md:backdrop-blur-[2px]",
      ].join(" ")}
    >
      <div className="mb-8 hidden flex-col items-center gap-3 md:flex">
        <div className="flex size-12 items-center justify-center overflow-hidden rounded-2xl bg-black shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/ordino-logo.png"
            alt="Ordino"
            width={48}
            height={48}
            className="size-full object-cover"
            draggable={false}
          />
        </div>
        <span
          className={`size-2.5 rounded-full ${statusTone}`}
          title="Session status"
        />
      </div>

      <nav className="flex w-full items-center justify-around md:w-auto md:flex-1 md:flex-col md:justify-start md:gap-3">
        <IconButton
          label="Chat history"
          onClick={onToggleHistory}
          active={historyOpen}
        >
          <AppIcon icon={BubbleChatIcon} size={20} title="Chat history" />
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
          label="Analyze PDF"
          onClick={() => setAnalysisOpen(true)}
          active={analysisOpen}
        >
          <AppIcon icon={File01Icon} size={20} title="Analyze PDF" />
        </IconButton>
      </nav>

      <div className="mb-5 hidden flex-col items-center gap-3 md:flex">
        <p className="brand-wordmark-solid rotate-180 text-xs tracking-[0.16em] [writing-mode:vertical-rl]">
          ordino
        </p>
      </div>
    </aside>
  );
}
