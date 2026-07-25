import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { GoogleAIClient } from "../google-ai-client";
import { generateStructuredOutput } from "../structured-output";

describe("generateStructuredOutput", () => {
  const schema = z.object({
    title: z.string(),
    count: z.number(),
  });

  it("returns parsed result on first try success", async () => {
    const client = new GoogleAIClient({
      provider: "google-ai-studio",
      modelId: "test",
      transportRetries: 2,
    });
    vi.spyOn(client, "generate").mockResolvedValueOnce({
      success: true,
      data: JSON.stringify({ title: "Hello", count: 42 }),
    });

    const res = await generateStructuredOutput(
      client,
      { prompt: "test" },
      schema,
    );
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toEqual({ title: "Hello", count: 42 });
    }
  });

  it("attempts repair on validation failure and succeeds", async () => {
    const client = new GoogleAIClient({
      provider: "google-ai-studio",
      modelId: "test",
      transportRetries: 2,
    });
    vi.spyOn(client, "generate")
      .mockResolvedValueOnce({
        success: true,
        data: JSON.stringify({ title: "Hello", count: "not a number" }),
      })
      .mockResolvedValueOnce({
        success: true,
        data: JSON.stringify({ title: "Hello", count: 10 }),
      });

    const res = await generateStructuredOutput(
      client,
      { prompt: "test" },
      schema,
    );
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toEqual({ title: "Hello", count: 10 });
    }
  });

  it("returns INVALID_MODEL_OUTPUT if repair also fails", async () => {
    const client = new GoogleAIClient({
      provider: "google-ai-studio",
      modelId: "test",
      transportRetries: 2,
    });
    vi.spyOn(client, "generate")
      .mockResolvedValueOnce({
        success: true,
        data: "invalid json 1",
      })
      .mockResolvedValueOnce({
        success: true,
        data: "invalid json 2",
      });

    const res = await generateStructuredOutput(
      client,
      { prompt: "test" },
      schema,
    );
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.code).toBe("INVALID_MODEL_OUTPUT");
    }
  });
});
