import { z } from "zod";
import { documentNodeSchema } from "./document";
import { nodeIdSchema } from "./ids";

export const outlineItemSchema = z
  .object({
    id: nodeIdSchema,
    index: z.number().int().nonnegative(),
    type: documentNodeSchema.options.map((option) => option.shape.type).length
      ? z.enum([
          "heading",
          "paragraph",
          "list",
          "table",
          "quote",
          "callout",
          "divider",
          "page_break",
        ])
      : z.never(),
    preview: z.string().max(120),
  })
  .strict();

export const documentOutlineSchema = z.array(outlineItemSchema);

export type OutlineItem = z.infer<typeof outlineItemSchema>;
export type DocumentOutline = z.infer<typeof documentOutlineSchema>;
