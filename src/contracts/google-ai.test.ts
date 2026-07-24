import { describe, expect, it } from "vitest";
import {
  googleAIConfigurationSchema,
  googleAIHealthResponseSchema,
} from "./google-ai";

describe("Google AI Studio contracts", () => {
  it("keeps AI calls on a same-origin API route", () => {
    const result = googleAIConfigurationSchema.safeParse({
      provider: "google-ai-studio",
      modelId: "gemini-2.5-flash",
      transportRetries: 2,
      routeBaseUrl: "/api/ai",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an external browser API base URL", () => {
    const result = googleAIConfigurationSchema.safeParse({
      provider: "google-ai-studio",
      modelId: "gemini-2.5-flash",
      transportRetries: 2,
      routeBaseUrl: "https://generativelanguage.googleapis.com",
    });

    expect(result.success).toBe(false);
  });

  it("validates a non-secret health response", () => {
    const result = googleAIHealthResponseSchema.safeParse({
      provider: "google-ai-studio",
      modelId: "gemini-2.5-flash",
      status: "not_configured",
      message: "GOOGLE_GENERATIVE_AI_API_KEY is not configured.",
    });

    expect(result.success).toBe(true);
  });
});
