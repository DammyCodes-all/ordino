import { z } from "zod";
import type { AppResult } from "./result";

export const googleAIConfigurationSchema = z
  .object({
    provider: z.literal("google-ai-studio"),
    modelId: z.string().trim().min(1),
    transportRetries: z.number().int().min(0).max(5),
    routeBaseUrl: z.string().startsWith("/api/ai"),
  })
  .strict();

export type GoogleAIConfiguration = z.infer<typeof googleAIConfigurationSchema>;

export interface ModelDiagnosticPort {
  checkConfigured(signal?: AbortSignal): Promise<AppResult<void>>;
  checkReachable(signal?: AbortSignal): Promise<AppResult<void>>;
  warmUpText(signal?: AbortSignal): Promise<AppResult<void>>;
  checkVision(signal?: AbortSignal): Promise<AppResult<void>>;
}

export const DEFAULT_GOOGLE_AI_CONFIGURATION: GoogleAIConfiguration = {
  provider: "google-ai-studio",
  modelId: "gemini-2.5-flash",
  transportRetries: 2,
  routeBaseUrl: "/api/ai",
};
