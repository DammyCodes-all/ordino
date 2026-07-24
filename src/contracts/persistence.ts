import { z } from "zod";
import { documentCheckpointSchema, documentStateSchema } from "./document";
import {
  messageIdSchema,
  referenceImageIdSchema,
} from "./ids";
import type { AppResult } from "./result";

export const referenceImageSchema = z
  .object({
    id: referenceImageIdSchema,
    name: z.string().trim().min(1).max(255),
    mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
    dataUrl: z.string().startsWith("data:image/"),
    purpose: z.string().trim().min(1).max(1_000).nullable(),
    addedAt: z.string().datetime(),
  })
  .strict();

export const conversationMessageSchema = z
  .object({
    id: messageIdSchema,
    role: z.enum(["user", "assistant"]),
    text: z.string().trim().min(1).max(20_000),
    referenceImageIds: z.array(referenceImageIdSchema),
    createdAt: z.string().datetime(),
  })
  .strict();

export const persistedSessionSchema = z
  .object({
    schemaVersion: z.literal(1),
    document: documentStateSchema,
    messages: z.array(conversationMessageSchema),
    referenceImages: z.array(referenceImageSchema),
    checkpoints: z.array(documentCheckpointSchema),
    savedAt: z.string().datetime(),
  })
  .strict();

export type ReferenceImage = z.infer<typeof referenceImageSchema>;
export type ConversationMessage = z.infer<typeof conversationMessageSchema>;
export type PersistedSession = z.infer<typeof persistedSessionSchema>;

export interface SessionRepository {
  load(): Promise<AppResult<PersistedSession | null>>;
  save(session: PersistedSession): Promise<AppResult<void>>;
  clear(): Promise<AppResult<void>>;
}
