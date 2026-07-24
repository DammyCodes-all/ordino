import type { GoogleAIConfiguration, ModelDiagnosticPort, AppResult } from "@/contracts";
import { createSuccessResult, createErrorResult, mapErrorToAppError } from "./errors";

export interface GenerateOptions {
  prompt: string;
  systemPrompt?: string;
  images?: Array<{ mimeType: "image/png" | "image/jpeg" | "image/webp"; dataUrl: string }>;
  signal?: AbortSignal;
}

export interface ToolDefinition {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface ToolCallResult {
  toolName: string;
  args: Record<string, unknown>;
}

export interface GenerateWithToolsOptions extends GenerateOptions {
  tools: ToolDefinition[];
  toolChoice?: "auto" | "required" | { type: "tool"; toolName: string };
}

export interface GenerateWithToolsResult {
  text: string;
  toolCalls?: ToolCallResult[];
}

export class GoogleAIClient {
  constructor(private config: GoogleAIConfiguration) {}

  async generate(options: GenerateOptions): Promise<AppResult<string>> {
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: options.prompt,
          systemPrompt: options.systemPrompt,
          modelId: this.config.modelId,
          images: options.images,
        }),
        signal: options.signal,
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        return createErrorResult(
          errorJson.code || "MODEL_REQUEST_FAILED",
          errorJson.message || `Route returned status ${res.status}`,
          res.status === 429 || res.status >= 500,
        );
      }

      const data = await res.json();
      return createSuccessResult(data.text);
    } catch (error) {
      return { success: false, error: mapErrorToAppError(error) };
    }
  }

  async generateWithTools(options: GenerateWithToolsOptions): Promise<AppResult<GenerateWithToolsResult>> {
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: options.prompt,
          systemPrompt: options.systemPrompt,
          modelId: this.config.modelId,
          images: options.images,
          tools: options.tools,
          toolChoice: options.toolChoice,
        }),
        signal: options.signal,
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        return createErrorResult(
          errorJson.code || "MODEL_REQUEST_FAILED",
          errorJson.message || `Route returned status ${res.status}`,
          res.status === 429 || res.status >= 500,
        );
      }

      const data = await res.json();
      return createSuccessResult(data);
    } catch (error) {
      return { success: false, error: mapErrorToAppError(error) };
    }
  }

  async runDiagnosticAction(action: string, signal?: AbortSignal): Promise<AppResult<void>> {
    try {
      const res = await fetch("/api/ai/diagnostics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
        signal,
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        return createErrorResult(
          errorJson.code || "MODEL_REQUEST_FAILED",
          errorJson.message || `Diagnostic route failed with ${res.status}`,
          res.status === 429 || res.status >= 500,
        );
      }
      return createSuccessResult(undefined);
    } catch (error) {
      return { success: false, error: mapErrorToAppError(error) };
    }
  }
}

export function createModelDiagnosticPort(config: GoogleAIConfiguration): ModelDiagnosticPort {
  const client = new GoogleAIClient(config);
  return {
    checkApiKey: (signal) => client.runDiagnosticAction("check_key", signal),
    checkAuthentication: (signal) => client.runDiagnosticAction("check_auth", signal),
    checkService: (signal) => client.runDiagnosticAction("check_service", signal),
    checkModelAvailable: (signal) => client.runDiagnosticAction("check_model", signal),
    warmUpText: (signal) => client.runDiagnosticAction("warmup", signal),
    checkVision: (signal) => client.runDiagnosticAction("check_vision", signal),
  };
}
