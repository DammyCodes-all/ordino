import { z } from "zod";

const toolDefinitionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  parameters: z.any().optional(),
});

const toolCallSchema = z.object({
  toolName: z.string(),
  args: z.any(),
});

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
  tools: z.array(toolDefinitionSchema).optional(),
  toolChoice: z
    .union([
      z.literal("auto"),
      z.literal("required"),
      z.object({ type: z.literal("tool"), toolName: z.string() }),
    ])
    .optional(),
});

export type AIGenerateRequest = z.infer<typeof aiGenerateRequestSchema>;

export const aiGenerateResponseSchema = z.object({
  text: z.string(),
  toolCalls: z.array(toolCallSchema).optional(),
});

export type AIGenerateResponse = z.infer<typeof aiGenerateResponseSchema>;
