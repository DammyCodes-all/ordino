"use client";

import { useSession } from "@/components/app-shell/session-context";

function statusColor(status: "checking" | "ready" | "failed") {
  if (status === "ready") return "bg-success";
  if (status === "failed") return "bg-danger";
  return "bg-warning animate-pulse-soft";
}

export function DiagnosticsStrip() {
  const {
    diagnosticsOpen,
    diagnosticChecks,
    health,
    setDiagnosticsOpen,
    refreshHealth,
  } = useSession();

  if (!diagnosticsOpen) return null;

  return (
    <div className="absolute inset-x-0 top-11 z-20 border-b border-border-subtle bg-surface/95 px-3 py-2.5 backdrop-blur-md sm:px-4">
      <div className="mx-auto flex max-w-5xl flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Startup diagnostics</p>
            <p className="text-[11px] text-muted-dim">
              {health
                ? `${health.provider} · ${health.modelId}`
                : "Checking Google AI Studio route…"}
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => void refreshHealth()}
              className="border border-border px-2.5 py-1 text-xs text-muted hover:text-foreground"
            >
              Re-check
            </button>
            <button
              type="button"
              onClick={() => setDiagnosticsOpen(false)}
              className="border border-border px-2.5 py-1 text-xs text-muted hover:text-foreground"
            >
              Close
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {diagnosticChecks.map((check) => (
            <div
              key={`${check.name}-${check.message}`}
              className="min-w-[11rem] flex-1 border border-border-subtle bg-background px-2.5 py-1.5"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`size-1.5 rounded-full ${statusColor(check.status)}`}
                />
                <span className="text-xs font-medium capitalize">
                  {check.name.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                {check.message}
              </p>
              {check.remediation ? (
                <p className="mt-1 text-[10px] leading-relaxed text-warning">
                  {check.remediation}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
