import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DEFAULT_VOICE_MODEL = "gemma-3-27b-it";

const voiceRequestSchema = z
  .object({
    mode: z.enum(["chat", "intro"]),
    userMessage: z.string().trim().min(1).max(8_000).optional(),
    documentText: z.string().trim().min(1).max(100_000),
    documentTitle: z.string().trim().min(1).max(200),
    preferredLanguage: z.string().trim().min(2).max(32).nullable().optional(),
    conversation: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          text: z.string().trim().min(1).max(8_000),
        }),
      )
      .max(24)
      .optional(),
  })
  .strict();

const voiceReplySchema = z.object({
  reply: z.string().trim().min(1).max(8_000),
  languageCode: z.string().trim().min(2).max(16),
  languageName: z.string().trim().min(1).max(80),
});

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        code: "MISSING_API_KEY",
        message: "GOOGLE_GENERATIVE_AI_API_KEY is not configured.",
      },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const parsed = voiceRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        {
          code: "INVALID_MODEL_OUTPUT",
          message: "Invalid voice request.",
          details: parsed.error.format(),
        },
        { status: 400 },
      );
    }

    const {
      mode,
      userMessage,
      documentText,
      documentTitle,
      preferredLanguage,
      conversation = [],
    } = parsed.data;

    if (mode === "chat" && !userMessage) {
      return Response.json(
        {
          code: "INVALID_MODEL_OUTPUT",
          message: "userMessage is required for chat mode.",
        },
        { status: 400 },
      );
    }

    const preferredModel =
      process.env.GOOGLE_GENERATIVE_AI_VOICE_MODEL?.trim() ||
      DEFAULT_VOICE_MODEL;
    const fallbackModel =
      process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim() || "gemini-2.5-flash";

    const history = conversation
      .map((turn) => `${turn.role === "user" ? "User" : "Gemma"}: ${turn.text}`)
      .join("\n");

    const systemPrompt = `You are Gemma, Ordino's multilingual voice guide for finished PDF documents.
You help users understand, navigate, and discuss the document content.
Always reply in the same language the user is speaking or writing.
If preferredLanguage is provided, use that language.
Keep spoken replies concise (2-6 sentences) unless the user asks for detail.
Never invent document content that is not present.
Return ONLY valid JSON matching:
{"reply": string, "languageCode": BCP-47 code like "en-US", "languageName": English name of the language}`;

    const prompt =
      mode === "intro"
        ? `Document title: ${documentTitle}
Preferred language (optional): ${preferredLanguage ?? "match the document language, default English"}

Document content:
${documentText.slice(0, 40_000)}

Task: Give a short spoken introduction offering to read the document aloud and answer questions. Reply in the preferred/document language.`
        : `Document title: ${documentTitle}
Preferred language hint: ${preferredLanguage ?? "detect from user message"}

Document content:
${documentText.slice(0, 40_000)}

Recent conversation:
${history || "(none)"}

User just said:
${userMessage}

Task: Answer helpfully about this document. Reply in the user's language.`;

    async function generateWith(modelId: string) {
      return generateText({
        model: google(modelId),
        system: systemPrompt,
        prompt,
        maxRetries: 1,
        abortSignal: request.signal,
      });
    }

    let result: Awaited<ReturnType<typeof generateText>>;
    try {
      result = await generateWith(preferredModel);
    } catch (primaryError) {
      if (preferredModel === fallbackModel) throw primaryError;
      result = await generateWith(fallbackModel);
    }

    const raw = result.text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const candidate = jsonMatch ? jsonMatch[0] : raw;
    let replyPayload: z.infer<typeof voiceReplySchema>;
    try {
      replyPayload = voiceReplySchema.parse(JSON.parse(candidate));
    } catch {
      replyPayload = {
        reply: raw.replace(/^```json\s*|```$/g, "").trim() || raw,
        languageCode: preferredLanguage || "en-US",
        languageName: "English",
      };
    }

    return Response.json(replyPayload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("401") || message.includes("403")) {
      return Response.json(
        { code: "MODEL_AUTH_FAILED", message },
        { status: 401 },
      );
    }
    if (message.includes("429")) {
      return Response.json(
        { code: "MODEL_RATE_LIMITED", message },
        { status: 429 },
      );
    }
    return Response.json(
      { code: "MODEL_REQUEST_FAILED", message },
      { status: 500 },
    );
  }
}
