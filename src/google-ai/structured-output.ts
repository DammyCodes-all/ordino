import type { z } from "zod";
import type { AppResult } from "@/contracts";
import { createErrorResult, createSuccessResult } from "./errors";
import type { GenerateOptions, GoogleAIClient } from "./google-ai-client";

export async function generateStructuredOutput<T>(
  client: GoogleAIClient,
  options: GenerateOptions,
  schema: z.ZodSchema<T>,
): Promise<AppResult<T>> {
  // First attempt
  const firstResult = await client.generate(options);
  if (!firstResult.success) {
    return firstResult;
  }

  const rawText = firstResult.data;
  const parsed = parseJsonAndValidate(rawText, schema);
  if (parsed.success) {
    return createSuccessResult(parsed.data);
  }

  // One repair attempt on validation failure
  const repairPrompt = `${options.prompt}

IMPORTANT: Your previous output failed JSON validation with the following error:
${parsed.error}

Please fix the error and return ONLY valid JSON adhering to the required schema.
Previous Output:
${rawText}`;

  const repairResult = await client.generate({
    ...options,
    prompt: repairPrompt,
  });

  if (!repairResult.success) {
    return repairResult;
  }

  const repairParsed = parseJsonAndValidate(repairResult.data, schema);
  if (repairParsed.success) {
    return createSuccessResult(repairParsed.data);
  }

  return createErrorResult(
    "INVALID_MODEL_OUTPUT",
    `Failed structured output validation after 1 repair attempt: ${repairParsed.error}`,
    false,
    { rawOutput: repairResult.data, validationError: repairParsed.error },
  );
}

function parseJsonAndValidate<T>(
  rawText: string,
  schema: z.ZodSchema<T>,
): { success: true; data: T } | { success: false; error: string } {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  try {
    const json = JSON.parse(cleaned);
    const result = schema.safeParse(json);
    if (result.success) {
      return { success: true, data: result.data };
    }
    return { success: false, error: JSON.stringify(result.error.format()) };
  } catch (err: any) {
    return { success: false, error: err?.message || "Invalid JSON syntax" };
  }
}
