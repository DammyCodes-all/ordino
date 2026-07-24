"use client";

import { useSession } from "@/components/app-shell/session-context";

export function ReviewFindings() {
  const { validation, visualReview, turn } = useSession();

  if (turn.running) return null;
  if (!validation && !visualReview) return null;

  const validationIssues = validation?.issues ?? [];
  const visualIssues = visualReview?.issues ?? [];
  const hasIssues = validationIssues.length > 0 || visualIssues.length > 0;
  const passed =
    (validation?.pass ?? true) && (visualReview?.pass ?? true) && !hasIssues;

  return (
    <div className="mx-auto mb-1.5 w-full max-w-2xl border border-border-subtle bg-surface/80 animate-fade-up">
      <div className="flex items-center justify-between gap-2 border-b border-border-subtle px-2.5 py-1.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-dim">
          Review
        </p>
        <p
          className={`text-[11px] font-medium ${
            passed ? "text-success" : "text-warning"
          }`}
        >
          {passed
            ? "Passed"
            : `${validationIssues.length + visualIssues.length} finding${
                validationIssues.length + visualIssues.length === 1 ? "" : "s"
              }`}
        </p>
      </div>

      {passed ? (
        <p className="px-2.5 py-2 text-xs text-muted">
          Layout validation
          {visualReview ? " and visual review" : ""} cleared for this version.
        </p>
      ) : (
        <ul className="max-h-40 space-y-1 overflow-y-auto px-2.5 py-2">
          {validationIssues.map((issue, index) => (
            <li
              key={`val-${issue.code}-${index}`}
              className="text-xs leading-snug text-muted"
            >
              <span className="font-medium text-foreground">
                {issue.severity === "error" ? "Error" : "Warning"}
              </span>
              {" · "}
              {issue.message}
              {issue.pageNumber ? ` · p.${issue.pageNumber}` : ""}
            </li>
          ))}
          {visualIssues.map((issue, index) => (
            <li
              key={`vis-${issue.type}-${index}`}
              className="text-xs leading-snug text-muted"
            >
              <span className="font-medium text-foreground">
                {issue.severity === "error" ? "Visual" : "Visual note"}
              </span>
              {" · "}
              {issue.detail}
              {issue.pageNumber ? ` · p.${issue.pageNumber}` : ""}
              {issue.suggestedAction ? (
                <span className="block text-[11px] text-muted-dim">
                  → {issue.suggestedAction}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
