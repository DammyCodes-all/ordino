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
    <div className="absolute inset-x-0 top-14 z-20 max-h-[min(70dvh,32rem)] overflow-y-auto border-b border-border-subtle bg-surface/95 px-3 py-3 backdrop-blur-md sm:px-5 sm:py-4 md:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <p className="text-sm font-medium sm:text-base">Startup diagnostics</p>
            <p className="mt-1 text-xs text-muted-dim sm:text-sm">
              {health
                ? `${health.provider} · ${health.modelId}`
                : "Checking Google AI Studio route…"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void refreshHealth()}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground sm:px-4 sm:py-2 sm:text-sm"
            >
              Re-check
            </button>
            <button
              type="button"
              onClick={() => setDiagnosticsOpen(false)}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground sm:px-4 sm:py-2 sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
          {diagnosticChecks.map((check) => (
            <div
              key={`${check.name}-${check.message}`}
              className="min-w-0 flex-1 rounded-2xl border border-border-subtle bg-background px-3 py-3 sm:min-w-[14rem] sm:px-4"
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
