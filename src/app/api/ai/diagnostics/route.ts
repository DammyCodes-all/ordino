import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_MODEL_ID = "gemma-4-31b-it";

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return Response.json({ code: "MISSING_API_KEY", message: "API key missing" }, { status: 503 });
  }

  try {
    const { action } = await request.json();
    const modelId = process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim() || DEFAULT_MODEL_ID;

    if (action === "check_key") {
      return Response.json({ success: true });
    }

    if (action === "check_auth" || action === "check_service" || action === "check_model" || action === "warmup") {
      await generateText({
        model: google(modelId),
        prompt: "ping",
        maxOutputTokens: 5,
        maxRetries: 0,
        abortSignal: request.signal,
      });
      return Response.json({ success: true });
    }

    if (action === "check_vision") {
      // 1x1 PNG transparent pixel
      const transparentPng = "data:image/png;base64,iVBORw0KGgoAAAANSAhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
      await generateText({
        model: google(modelId),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Describe image" },
              { type: "image", image: transparentPng },
            ],
          },
        ],
        maxOutputTokens: 5,
        maxRetries: 0,
        abortSignal: request.signal,
      });
      return Response.json({ success: true });
    }

    return Response.json({ code: "INVALID_REQUEST", message: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    const msg = error?.message || String(error);
    if (msg.includes("401") || msg.includes("403")) {
      return Response.json({ code: "MODEL_AUTH_FAILED", message: msg }, { status: 401 });
    }
    if (msg.includes("429")) {
      return Response.json({ code: "MODEL_RATE_LIMITED", message: msg }, { status: 429 });
    }
    return Response.json({ code: "MODEL_SERVICE_UNAVAILABLE", message: msg }, { status: 503 });
  }
}
