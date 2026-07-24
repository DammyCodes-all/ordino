import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import type {
  AppResult,
  PdfAnalysisRequest,
  RawPdfAnalysisResponse,
} from "@/contracts";
import { rawPdfAnalysisResponseSchema } from "@/contracts";
import {
  createErrorResult,
  createSuccessResult,
  mapErrorToAppError,
} from "@/google-ai";

const DEFAULT_MODEL_ID = "gemini-2.5-flash";

function parseJsonAndValidate(
  rawText: string,
):
  | { success: true; data: RawPdfAnalysisResponse }
  | { success: false; error: string } {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  try {
    const json = JSON.parse(cleaned);
    const result = rawPdfAnalysisResponseSchema.safeParse(json);
    if (result.success) return { success: true, data: result.data };
    return { success: false, error: JSON.stringify(result.error.format()) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Invalid JSON",
    };
  }
}

export async function runPdfAnalysisModel(
  request: PdfAnalysisRequest,
  systemPrompt: string,
  userPrompt: string,
  signal?: AbortSignal,
): Promise<AppResult<RawPdfAnalysisResponse>> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return createErrorResult(
      "MISSING_API_KEY",
      "GOOGLE_GENERATIVE_AI_API_KEY is not configured.",
      false,
    );
  }

  const modelToUse =
    process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim() || DEFAULT_MODEL_ID;

  const content: Array<
    { type: "text"; text: string } | { type: "image"; image: string }
  > = [
    { type: "text", text: userPrompt },
    ...request.pages.map((page) => ({
      type: "image" as const,
      image: page.imageDataUrl,
    })),
  ];

  try {
    const first = await generateText({
      model: google(modelToUse),
      system: systemPrompt,
      messages: [{ role: "user", content }],
      maxRetries: 2,
      abortSignal: signal,
    });

    const parsed = parseJsonAndValidate(first.text);
    if (parsed.success) {
      return createSuccessResult(parsed.data);
    }

    const repair = await generateText({
      model: google(modelToUse),
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${userPrompt}

IMPORTANT: Previous output failed JSON validation:
${parsed.error}

Return ONLY valid JSON for the required schema.
Previous output:
${first.text}`,
            },
            ...request.pages.map((page) => ({
              type: "image" as const,
              image: page.imageDataUrl,
            })),
          ],
        },
      ],
      maxRetries: 1,
      abortSignal: signal,
    });

    const repaired = parseJsonAndValidate(repair.text);
    if (repaired.success) {
      return createSuccessResult(repaired.data);
    }

    return createErrorResult(
      "INVALID_MODEL_OUTPUT",
      `PDF analysis output invalid after repair: ${repaired.error}`,
      false,
    );
  } catch (error) {
    return createErrorResult(
      mapErrorToAppError(error).code,
      mapErrorToAppError(error).message,
      mapErrorToAppError(error).retryable,
    );
  }
}
