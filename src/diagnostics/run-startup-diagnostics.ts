import type {
  DiagnosticCheck,
  DiagnosticName,
  StartupDiagnosticDependencies,
  StartupDiagnosticResult,
} from "@/contracts";
import { createErrorResult, createSuccessResult } from "@/google-ai";

function check(
  name: DiagnosticName,
  status: DiagnosticCheck["status"],
  message: string,
  remediation: string | null = null,
): DiagnosticCheck {
  return { name, status, message, remediation };
}

async function resultToCheck(
  name: DiagnosticName,
  run: () => Promise<{ success: boolean; error?: { message: string } }>,
  readyMessage: string,
  remediation: string,
): Promise<DiagnosticCheck> {
  try {
    const result = await run();
    if (result.success) {
      return check(name, "ready", readyMessage, null);
    }
    return check(
      name,
      "failed",
      result.error?.message || "Check failed.",
      remediation,
    );
  } catch (error) {
    return check(
      name,
      "failed",
      error instanceof Error ? error.message : String(error),
      remediation,
    );
  }
}

export async function runStartupDiagnostics(
  dependencies: StartupDiagnosticDependencies,
  signal?: AbortSignal,
): Promise<StartupDiagnosticResult> {
  const { model, checkStorage, checkPdfRenderer, checkExport } = dependencies;

  const checks: DiagnosticCheck[] = await Promise.all([
    resultToCheck(
      "api_key",
      () => model.checkApiKey(signal),
      "Server API key is configured.",
      "Set GOOGLE_GENERATIVE_AI_API_KEY in the server environment (never NEXT_PUBLIC_).",
    ),
    resultToCheck(
      "authentication",
      () => model.checkAuthentication(signal),
      "Google AI Studio authentication succeeded.",
      "Verify the API key is valid for Google AI Studio.",
    ),
    resultToCheck(
      "google_ai_service",
      () => model.checkService(signal),
      "Google AI Studio service is reachable.",
      "Confirm internet access and Google AI Studio availability.",
    ),
    resultToCheck(
      "model",
      () => model.checkModelAvailable(signal),
      "Configured model is available.",
      "Check GOOGLE_GENERATIVE_AI_MODEL or switch to a supported Gemini model.",
    ),
    resultToCheck(
      "vision",
      () => model.checkVision(signal),
      "Vision capability is available for PDF review.",
      "Use a vision-capable Gemini model for visual review.",
    ),
    resultToCheck(
      "storage",
      () => checkStorage(signal),
      "Local session storage is available.",
      "Enable IndexedDB / local storage in the browser.",
    ),
    resultToCheck(
      "pdf_renderer",
      () => checkPdfRenderer(signal),
      "PDF render API is ready.",
      "Check /api/pdf/render and server logs for render failures.",
    ),
    resultToCheck(
      "export",
      () => checkExport(signal),
      "PDF export API is ready.",
      "Check /api/pdf/export and confirm render succeeds first.",
    ),
  ]);

  // Soft internet signal from service check
  const service = checks.find((item) => item.name === "google_ai_service");
  checks.push(
    check(
      "internet",
      service?.status === "ready" ? "ready" : "failed",
      service?.status === "ready"
        ? "Network path to Google AI Studio is available."
        : "Could not confirm internet / Google reachability.",
      service?.status === "ready"
        ? null
        : "Reconnect to the internet and retry diagnostics.",
    ),
  );

  checks.push(
    check(
      "rate_limit",
      "ready",
      "No rate-limit signal reported on startup checks.",
      null,
    ),
  );

  const blocking = new Set<DiagnosticName>([
    "api_key",
    "authentication",
    "google_ai_service",
    "model",
    "vision",
  ]);
  const ready = checks
    .filter((item) => blocking.has(item.name))
    .every((item) => item.status === "ready");

  return { ready, checks };
}

export function createMemoryStorageCheck() {
  return async () => {
    try {
      const key = "ordino-diag";
      window.localStorage.setItem(key, "1");
      window.localStorage.removeItem(key);
      return createSuccessResult(undefined);
    } catch {
      return createErrorResult(
        "PERSISTENCE_FAILED",
        "Local storage is blocked.",
        false,
      );
    }
  };
}
