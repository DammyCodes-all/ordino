import type { WorkflowEvent, WorkflowStage } from "@/contracts";

const STAGE_CHAT: Partial<Record<WorkflowStage, string>> = {
  planning: "I'm sketching a structure for this…",
  generating: "Writing the sections now…",
  rendering: "Laying this out as a PDF…",
  validating: "Checking the layout for issues…",
  rasterizing: "Preparing page images for review…",
  reviewing: "Giving the pages a visual pass…",
  revising: "Tweaking things from the review notes…",
  finalizing: "Wrapping up…",
  ready: "All set — your document is ready in the preview.",
  failed: "Something went wrong while working on that.",
  cancelled: "Stopped — send another message when you want to continue.",
};

export function narrateTurnStart(userText: string): string {
  const clipped = userText.trim().slice(0, 80);
  if (!clipped) return "On it — I'll get started.";
  return `On it — working on “${clipped}${userText.trim().length > 80 ? "…" : ""}”.`;
}

export function narrateWorkflowEvent(event: WorkflowEvent): string | null {
  if (event.level === "error") {
    return event.message.slice(0, 280);
  }
  // Prefer the live event message so writer/review step progress is visible.
  const message = event.message.trim();
  if (message) return message.slice(0, 280);
  return STAGE_CHAT[event.stage] ?? null;
}

export function appendNarration(existing: string, line: string): string {
  const next = line.trim();
  if (!next) return existing;
  if (existing.includes(next)) return existing;
  return `${existing}\n\n${next}`.slice(0, 20_000);
}

export function narrateTurnSuccess(args: {
  liveText: string;
  title: string;
  reviewIterations: number;
}): string {
  const title = args.title.trim() || "your document";
  const review =
    args.reviewIterations > 0
      ? ` I ran ${args.reviewIterations} review pass${args.reviewIterations === 1 ? "" : "es"}.`
      : "";
  const closing = `Done — “${title}” is ready in the preview.${review} Want any changes?`;
  return appendNarration(args.liveText, closing);
}

export function narrateTurnFailure(liveText: string, message: string): string {
  return appendNarration(
    liveText,
    message.trim() || STAGE_CHAT.failed || "Something went wrong.",
  );
}
