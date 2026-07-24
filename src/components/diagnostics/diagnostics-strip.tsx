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
    <div className="absolute inset-x-0 top-14 z-20 border-b border-border-subtle bg-surface/95 px-5 py-4 backdrop-blur-md sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-base font-medium">Startup diagnostics</p>
            <p className="mt-1 text-sm text-muted-dim">
              {health
                ? `${health.provider} · ${health.modelId}`
                : "Checking Google AI Studio route…"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void refreshHealth()}
              className="rounded-full border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
            >
              Re-check
            </button>
            <button
              type="button"
              onClick={() => setDiagnosticsOpen(false)}
              className="rounded-full border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
            >
              Close
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {diagnosticChecks.map((check) => (
            <div
              key={`${check.name}-${check.message}`}
              className="min-w-[14rem] flex-1 rounded-2xl border border-border-subtle bg-background px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`size-2.5 rounded-full ${statusColor(check.status)}`}
                />
                <span className="text-sm font-medium capitalize">
                  {check.name.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {check.message}
              </p>
              {check.remediation ? (
                <p className="mt-2 text-xs leading-relaxed text-warning">
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
