"use client";

import { ChevronDownIcon, ChevronUpIcon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { useSession } from "@/components/app-shell/session-context";
import { AppIcon } from "@/components/ui/app-icon";

export function ReviewFindings() {
  const { validation, visualReview, turn } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  if (turn.running) return null;
  if (!validation && !visualReview) return null;

  const validationIssues = validation?.issues ?? [];
  const visualIssues = visualReview?.issues ?? [];
  const hasIssues = validationIssues.length > 0 || visualIssues.length > 0;
  const passed =
    (validation?.pass ?? true) && (visualReview?.pass ?? true) && !hasIssues;

  return (
    <div className="mx-auto mb-1.5 w-full max-w-2xl border border-border-subtle bg-surface/80 animate-fade-up">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className={`flex w-full items-center justify-between gap-2 border-b border-border-subtle px-2.5 py-1.5 ${collapsed ? "" : "border-b-0"}`}
      >
        <p className="text-[10px] uppercase tracking-wider text-muted-dim">
          Review
        </p>
        <span className="flex items-center gap-2">
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
          <AppIcon
            icon={collapsed ? ChevronDownIcon : ChevronUpIcon}
            size={14}
            className="text-muted-dim"
          />
        </span>
      </button>

      {!collapsed &&
        (passed ? (
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
        ))}
    </div>
  );
}
