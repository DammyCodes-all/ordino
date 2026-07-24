import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

const originalApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

afterEach(() => {
  if (originalApiKey === undefined) {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  } else {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalApiKey;
  }
});

describe("GET /api/ai/health", () => {
  it("returns a typed non-secret response when the server key is missing", async () => {
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    const response = await GET(
      new Request("http://localhost:3000/api/ai/health"),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      provider: "google-ai-studio",
      modelId: "gemini-2.5-flash",
      status: "not_configured",
      message: "GOOGLE_GENERATIVE_AI_API_KEY is not configured.",
    });
    expect(JSON.stringify(body)).not.toContain(
      originalApiKey ?? "never-present",
    );
  });
});
