import { z } from "zod";
import type { ModelDiagnosticPort } from "./google-ai";
import type { AppResult } from "./result";

export const diagnosticNameSchema = z.enum([
  "google_ai",
  "api_key",
  "model",
  "vision",
  "pdf_renderer",
  "storage",
  "export",
]);

export const diagnosticCheckSchema = z
  .object({
    name: diagnosticNameSchema,
    status: z.enum(["checking", "ready", "failed"]),
    message: z.string().min(1),
    remediation: z.string().min(1).nullable(),
  })
  .strict();

export const startupDiagnosticResultSchema = z
  .object({
    ready: z.boolean(),
    checks: z.array(diagnosticCheckSchema),
  })
  .strict();

export type DiagnosticName = z.infer<typeof diagnosticNameSchema>;
export type DiagnosticCheck = z.infer<typeof diagnosticCheckSchema>;
export type StartupDiagnosticResult = z.infer<
  typeof startupDiagnosticResultSchema
>;

export interface StartupDiagnosticDependencies {
  model: ModelDiagnosticPort;
  checkStorage(signal?: AbortSignal): Promise<AppResult<void>>;
  checkPdfRenderer(signal?: AbortSignal): Promise<AppResult<void>>;
  checkExport(signal?: AbortSignal): Promise<AppResult<void>>;
}

export type RunStartupDiagnostics = (
  dependencies: StartupDiagnosticDependencies,
  signal?: AbortSignal,
) => Promise<StartupDiagnosticResult>;
