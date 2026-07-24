"use client";

import {
  STAGE_LABELS,
  useSession,
} from "@/components/app-shell/session-context";
import type { WorkflowStage } from "@/contracts";

const PIPELINE: WorkflowStage[] = [
  "planning",
  "generating",
  "rendering",
  "validating",
  "rasterizing",
  "reviewing",
  "revising",
  "finalizing",
  "ready",
];

function toneFor(
  stage: WorkflowStage,
  current: WorkflowStage,
  events: { stage: WorkflowStage; level: string }[],
  running: boolean,
) {
  const seen = events.some((event) => event.stage === stage);
  const failed = events.some(
    (event) => event.stage === stage && event.level === "error",
  );
  const cancelled = current === "cancelled";

  if (failed) return "failed";
  if (cancelled && seen) return "cancelled";
  if (running && current === stage) return "running";
  if (seen || current === "ready") return "completed";
  return "pending";
}

type StatusPanelProps = {
  compact?: boolean;
};

export function StatusPanel({ compact = false }: StatusPanelProps) {
  const { workflowEvents, turn, stageLabel } = useSession();

  return (
    <div
      className={`flex flex-col gap-3 ${compact ? "px-0 py-0" : "px-4 py-4"}`}
    >
      <div className="rounded-xl border border-border-subtle bg-surface-raised px-3 py-2">
        <p className="text-[11px] uppercase tracking-wider text-muted-dim">
          {turn.running ? "Generating" : "Current"}
        </p>
        <p className="mt-1 text-sm text-foreground">
          {turn.running ? (
            <span className="inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-accent animate-pulse-soft" />
              {stageLabel}…
            </span>
          ) : (
            stageLabel
          )}
        </p>
        {turn.reviewIteration > 0 ? (
          <p className="mt-1 text-xs text-muted-dim">
            Review iteration {turn.reviewIteration}/3
          </p>
        ) : null}
      </div>

      <ol className="flex flex-col gap-1.5">
        {PIPELINE.map((stage) => {
          const tone = toneFor(stage, turn.stage, workflowEvents, turn.running);
          return (
            <li
              key={stage}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm"
            >
              <span
                className={`size-2 shrink-0 rounded-full ${
                  tone === "running"
                    ? "bg-accent animate-pulse-soft"
                    : tone === "completed"
                      ? "bg-success"
                      : tone === "failed"
                        ? "bg-danger"
                        : tone === "cancelled"
                          ? "bg-warning"
                          : "bg-border"
                }`}
              />
              <span
                className={
                  tone === "running"
                    ? "font-medium text-foreground"
                    : tone === "pending"
                      ? "text-muted-dim"
                      : "text-foreground/90"
                }
              >
                {STAGE_LABELS[stage]}
              </span>
            </li>
          );
        })}
      </ol>

      {!compact && workflowEvents.length > 0 ? (
        <div className="mt-2 border-t border-border-subtle pt-3">
          <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-dim">
            Event log
          </p>
          <ul className="flex max-h-40 flex-col gap-1 overflow-y-auto text-xs text-muted">
            {workflowEvents.map((event) => (
              <li key={`${event.stage}-${event.createdAt}`}>{event.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {!compact && workflowEvents.length === 0 ? (
        <p className="text-xs text-muted-dim">
          Workflow stages appear while a turn is running.
        </p>
      ) : null}
    </div>
  );
}
