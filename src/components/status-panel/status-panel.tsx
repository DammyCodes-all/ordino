"use client";

import { AnimatePresence, motion } from "motion/react";
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

function reachedStages(
  current: WorkflowStage,
  events: { stage: WorkflowStage; level: string }[],
): WorkflowStage[] {
  if (current === "idle") return [];
  if (current === "failed" || current === "cancelled") {
    const fromEvents = PIPELINE.filter((stage) =>
      events.some((event) => event.stage === stage),
    );
    return fromEvents.length > 0 ? fromEvents : [current];
  }

  const index = PIPELINE.indexOf(current);
  if (index < 0) return [current];
  return PIPELINE.slice(0, index + 1);
}

function toneFor(
  stage: WorkflowStage,
  current: WorkflowStage,
  events: { stage: WorkflowStage; level: string }[],
  running: boolean,
) {
  const failed = events.some(
    (event) => event.stage === stage && event.level === "error",
  );
  if (failed || current === "failed") return "failed" as const;
  if (current === "cancelled") return "cancelled" as const;
  if (running && current === stage) return "running" as const;
  if (current === "ready" || PIPELINE.indexOf(stage) < PIPELINE.indexOf(current))
    return "completed" as const;
  return "pending" as const;
}

export function StatusPanel() {
  const { workflowEvents, turn, stageLabel } = useSession();

  if (!turn.running && turn.stage === "idle") return null;

  const visible = reachedStages(turn.stage, workflowEvents);
  if (visible.length === 0) return null;

  return (
    <div
      className="mb-3 overflow-hidden rounded-2xl border border-border bg-surface/90 px-3 py-2.5 backdrop-blur-sm"
      aria-live="polite"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium tracking-[0.14em] text-muted-dim uppercase">
          {turn.running ? "Working" : "Status"}
        </p>
        <p className="truncate text-xs text-muted">
          {turn.running ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-accent animate-pulse-soft" />
              {stageLabel}
            </span>
          ) : (
            stageLabel
          )}
        </p>
      </div>

      <ol className="flex flex-col gap-1">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((stage, index) => {
            const tone = toneFor(
              stage,
              turn.stage,
              workflowEvents,
              turn.running,
            );
            return (
              <motion.li
                key={stage}
                layout
                initial={{ opacity: 0, y: 10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                transition={{
                  duration: 0.28,
                  ease: [0.22, 1, 0.36, 1],
                  delay: Math.min(index * 0.04, 0.16),
                }}
                className="flex items-center gap-2.5 overflow-hidden py-1 text-sm"
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
                      : tone === "completed"
                        ? "text-foreground/80"
                        : "text-muted"
                  }
                >
                  {STAGE_LABELS[stage]}
                  {tone === "running" ? "…" : ""}
                </span>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>

      {turn.reviewIteration > 0 ? (
        <p className="mt-1.5 text-[11px] text-muted-dim">
          Review iteration {turn.reviewIteration}/3
        </p>
      ) : null}
    </div>
  );
}
