import { z } from "zod";
import { highlightIdSchema, narrationSegmentIdSchema } from "./ids";

export const narrationSegmentSchema = z
  .object({
    id: narrationSegmentIdSchema,
    highlightId: highlightIdSchema.nullable(),
    pageNumber: z.number().int().positive().nullable(),
    text: z.string().min(1).max(4_000),
    language: z.string().min(2).max(64),
    order: z.number().int().nonnegative(),
  })
  .strict();

export const narrationPlaylistSchema = z
  .object({
    language: z.string().min(2).max(64),
    segments: z.array(narrationSegmentSchema),
  })
  .strict();

export type NarrationSegment = z.infer<typeof narrationSegmentSchema>;
export type NarrationPlaylist = z.infer<typeof narrationPlaylistSchema>;
