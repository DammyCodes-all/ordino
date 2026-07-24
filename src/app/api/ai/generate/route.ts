import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { aiGenerateRequestSchema } from "./configuration";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_MODEL_ID = "gemini-2.5-flash";

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { code: "MISSING_API_KEY", message: "GOOGLE_GENERATIVE_AI_API_KEY environment variable is not configured." },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const parsed = aiGenerateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { code: "INVALID_MODEL_OUTPUT", message: "Invalid request payload", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const { prompt, systemPrompt, modelId, images } = parsed.data;
    const modelToUse = modelId?.trim() || process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim() || DEFAULT_MODEL_ID;

    let content: string | Array<{ type: "text"; text: string } | { type: "image"; image: string }> = prompt;

    if (images && images.length > 0) {
      content = [
        { type: "text", text: prompt },
        ...images.map((img) => ({
          type: "image" as const,
          image: img.dataUrl,
        })),
      ];
    }

    const result = await generateText({
      model: google(modelToUse),
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: content as any,
        },
      ],
      maxRetries: 2,
      abortSignal: request.signal,
    });

    return Response.json({ text: result.text });
  } catch (error: any) {
    const message = error?.message || String(error);
    if (message.includes("401") || message.includes("403") || message.includes("API key")) {
      return Response.json(
        { code: "MODEL_AUTH_FAILED", message: "Authentication failed for Google AI Studio." },
        { status: 401 },
      );
    }
    if (message.includes("429")) {
      return Response.json(
        { code: "MODEL_RATE_LIMITED", message: "Rate limited by Google AI Studio." },
        { status: 429 },
      );
    }
    return Response.json(
      { code: "MODEL_REQUEST_FAILED", message: message || "Failed to generate AI response." },
      { status: 500 },
    );
  }
}
