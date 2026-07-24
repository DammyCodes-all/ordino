import { describe, expect, it } from "vitest";
import {
  googleAIConfigurationSchema,
  googleAIHealthResponseSchema,
} from "./google-ai";

describe("Google AI Studio contracts", () => {
  it("validates server-side Google AI configuration", () => {
    const result = googleAIConfigurationSchema.safeParse({
      provider: "google-ai-studio",
      modelId: "gemma-4-31b-it",
      transportRetries: 2,
    });

    expect(result.success).toBe(true);
  });

  it("validates a non-secret health response", () => {
    const result = googleAIHealthResponseSchema.safeParse({
      provider: "google-ai-studio",
      modelId: "gemma-4-31b-it",
      status: "not_configured",
      message: "GOOGLE_GENERATIVE_AI_API_KEY is not configured.",
    });

    expect(result.success).toBe(true);
  });
});
