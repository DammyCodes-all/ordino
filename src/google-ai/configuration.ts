import { z } from "zod";

export const aiGenerateRequestSchema = z.object({
  prompt: z.string().min(1).max(100000),
  systemPrompt: z.string().optional(),
  modelId: z.string().optional(),
  schemaJson: z.string().optional(),
  images: z
    .array(
      z.object({
        mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
        dataUrl: z.string(),
      }),
    )
    .optional(),
  maxTokens: z.number().optional(),
});

export type AIGenerateRequest = z.infer<typeof aiGenerateRequestSchema>;

export const aiGenerateResponseSchema = z.object({
  text: z.string(),
});

export type AIGenerateResponse = z.infer<typeof aiGenerateResponseSchema>;
