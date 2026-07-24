import { z } from "zod";
import { documentNodeTypeSchema } from "./document";
import { nodeIdSchema } from "./ids";

export const outlineItemSchema = z
  .object({
    id: nodeIdSchema,
    index: z.number().int().nonnegative(),
    type: documentNodeTypeSchema,
    preview: z.string().max(120),
  })
  .strict();

export const documentOutlineSchema = z.array(outlineItemSchema);

export type OutlineItem = z.infer<typeof outlineItemSchema>;
export type DocumentOutline = z.infer<typeof documentOutlineSchema>;
