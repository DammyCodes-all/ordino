import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { googleAIHealthResponseSchema } from "@/contracts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_MODEL_ID = "gemma-4-31b-it";

export async function GET(request: Request): Promise<Response> {
  const modelId =
    process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim() || DEFAULT_MODEL_ID;

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json(
      googleAIHealthResponseSchema.parse({
        provider: "google-ai-studio",
        modelId,
        status: "not_configured",
        message: "GOOGLE_GENERATIVE_AI_API_KEY is not configured.",
      }),
      { status: 503 },
    );
  }

  try {
    await generateText({
      model: google(modelId),
      prompt: "Reply with exactly: OK",
      maxOutputTokens: 8,
      maxRetries: 0,
      abortSignal: request.signal,
    });

    return Response.json(
      googleAIHealthResponseSchema.parse({
        provider: "google-ai-studio",
        modelId,
        status: "ready",
        message: "Google AI Studio is configured and reachable.",
      }),
    );
  } catch (error) {
    console.error("Google AI Studio health check failed", error);

    return Response.json(
      googleAIHealthResponseSchema.parse({
        provider: "google-ai-studio",
        modelId,
        status: "unavailable",
        message:
          "Google AI Studio could not be reached with this configuration.",
      }),
      { status: 503 },
    );
  }
}
