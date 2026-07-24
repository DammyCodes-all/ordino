import { z } from "zod";
import type { AppResult } from "./result";

export const googleAIConfigurationSchema = z
  .object({
    provider: z.literal("google-ai-studio"),
    modelId: z.string().trim().min(1),
    transportRetries: z.number().int().min(0).max(5),
  })
  .strict();

export const googleAIHealthResponseSchema = z
  .object({
    provider: z.literal("google-ai-studio"),
    modelId: z.string().trim().min(1),
    status: z.enum(["ready", "not_configured", "unavailable"]),
    message: z.string().trim().min(1).max(500),
  })
  .strict();

export type GoogleAIHealthResponse = z.infer<
  typeof googleAIHealthResponseSchema
>;
export type GoogleAIConfiguration = z.infer<typeof googleAIConfigurationSchema>;

export interface ModelDiagnosticPort {
  checkApiKey(signal?: AbortSignal): Promise<AppResult<void>>;
  checkAuthentication(signal?: AbortSignal): Promise<AppResult<void>>;
  checkService(signal?: AbortSignal): Promise<AppResult<void>>;
  checkModelAvailable(signal?: AbortSignal): Promise<AppResult<void>>;
  warmUpText(signal?: AbortSignal): Promise<AppResult<void>>;
  checkVision(signal?: AbortSignal): Promise<AppResult<void>>;
}

export const DEFAULT_GOOGLE_AI_CONFIGURATION: GoogleAIConfiguration = {
  provider: "google-ai-studio",
  modelId: "gemma-4-31b-it",
  transportRetries: 2,
};
