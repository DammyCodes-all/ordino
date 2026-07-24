import { z } from "zod";
import { checkpointIdSchema, documentIdSchema, nodeIdSchema } from "./ids";

export const documentNodeTypeSchema = z.enum([
  "heading",
  "paragraph",
  "list",
  "table",
  "quote",
  "callout",
  "divider",
  "page_break",
]);

export const writingStyleSchema = z.enum([
  "professional",
  "academic",
  "formal",
  "concise",
  "persuasive",
]);

export const alignmentSchema = z.enum(["left", "center", "right", "justify"]);
export const nonJustifiedAlignmentSchema = z.enum(["left", "center", "right"]);
export const spacingTokenSchema = z.enum(["none", "xs", "sm", "md", "lg"]);
export const emphasisSchema = z.enum(["normal", "bold", "italic"]);

export const documentMetaSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    documentType: z.string().trim().min(1).max(120),
    audience: z.string().trim().min(1).max(200),
    writingStyle: writingStyleSchema,
    instructions: z.string().trim().min(1).max(4_000).nullable(),
    pageLimit: z.number().int().positive().nullable(),
  })
  .strict();

export const blockSpacingSchema = z
  .object({
    spaceBefore: spacingTokenSchema,
    spaceAfter: spacingTokenSchema,
  })
  .strict();

export const headingStyleSchema = blockSpacingSchema
  .extend({
    alignment: nonJustifiedAlignmentSchema,
    keepWithNext: z.boolean(),
  })
  .strict();

export const paragraphStyleSchema = blockSpacingSchema
  .extend({
    alignment: alignmentSchema,
    emphasis: emphasisSchema,
  })
  .strict();

export const listStyleSchema = blockSpacingSchema
  .extend({ compact: z.boolean() })
  .strict();

export const tableStyleSchema = blockSpacingSchema
  .extend({
    density: z.enum(["compact", "comfortable"]),
    headerAlignment: nonJustifiedAlignmentSchema,
    striped: z.boolean(),
  })
  .strict();

export const quoteStyleSchema = blockSpacingSchema
  .extend({ alignment: z.enum(["left", "center"]) })
  .strict();

export const calloutStyleSchema = blockSpacingSchema
  .extend({ variant: z.enum(["note", "highlight", "warning"]) })
  .strict();

export const dividerStyleSchema = blockSpacingSchema
  .extend({ variant: z.enum(["solid", "subtle"]) })
  .strict();

const headingNodeSchema = z
  .object({
    id: nodeIdSchema,
    type: z.literal("heading"),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    text: z.string().trim().min(1).max(200),
    style: headingStyleSchema,
  })
  .strict();

const paragraphNodeSchema = z
  .object({
    id: nodeIdSchema,
    type: z.literal("paragraph"),
    text: z.string().trim().min(1).max(8_000),
    style: paragraphStyleSchema,
  })
  .strict();

const listNodeSchema = z
  .object({
    id: nodeIdSchema,
    type: z.literal("list"),
    ordered: z.boolean(),
    items: z.array(z.string().trim().min(1).max(1_000)).min(1).max(20),
    style: listStyleSchema,
  })
  .strict();

export const tableColumnSchema = z
  .object({
    header: z.string().trim().min(1).max(200),
    widthPercent: z.number().positive().max(100).nullable(),
  })
  .strict();

const tableNodeSchema = z
  .object({
    id: nodeIdSchema,
    type: z.literal("table"),
    columns: z.array(tableColumnSchema).min(1).max(6),
    rows: z.array(z.array(z.string().trim().min(1).max(2_000))).max(20),
    style: tableStyleSchema,
  })
  .strict()
  .superRefine((table, context) => {
    for (const [rowIndex, row] of table.rows.entries()) {
      if (row.length !== table.columns.length) {
        context.addIssue({
          code: "custom",
          message: "Each table row must match the column count.",
          path: ["rows", rowIndex],
        });
      }
    }

    const widths = table.columns.map((column) => column.widthPercent);
    const hasWidths = widths.some((width) => width !== null);
    const hasMissingWidths = widths.some((width) => width === null);

    if (hasWidths && hasMissingWidths) {
      context.addIssue({
        code: "custom",
        message: "Table widths must be either all specified or all null.",
        path: ["columns"],
      });
    }

    if (hasWidths) {
      const total = widths.reduce<number>(
        (sum, width) => sum + (width ?? 0),
        0,
      );
      if (Math.abs(total - 100) > 0.01) {
        context.addIssue({
          code: "custom",
          message: "Specified table widths must total 100 percent.",
          path: ["columns"],
        });
      }
    }
  });

const quoteNodeSchema = z
  .object({
    id: nodeIdSchema,
    type: z.literal("quote"),
    text: z.string().trim().min(1).max(4_000),
    attribution: z.string().trim().min(1).max(300).nullable(),
    style: quoteStyleSchema,
  })
  .strict();

const calloutNodeSchema = z
  .object({
    id: nodeIdSchema,
    type: z.literal("callout"),
    title: z.string().trim().min(1).max(200).nullable(),
    text: z.string().trim().min(1).max(4_000),
    style: calloutStyleSchema,
  })
  .strict();

const dividerNodeSchema = z
  .object({
    id: nodeIdSchema,
    type: z.literal("divider"),
    style: dividerStyleSchema,
  })
  .strict();

const pageBreakNodeSchema = z
  .object({ id: nodeIdSchema, type: z.literal("page_break") })
  .strict();

export const documentNodeSchema = z.discriminatedUnion("type", [
  headingNodeSchema,
  paragraphNodeSchema,
  listNodeSchema,
  tableNodeSchema,
  quoteNodeSchema,
  calloutNodeSchema,
  dividerNodeSchema,
  pageBreakNodeSchema,
]);

export const documentStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    documentId: documentIdSchema,
    version: z.number().int().nonnegative(),
    reviewRevision: z.number().int().nonnegative(),
    meta: documentMetaSchema,
    nodes: z.array(documentNodeSchema),
  })
  .strict();

export const documentCheckpointSchema = z
  .object({
    id: checkpointIdSchema,
    reason: z.enum(["user_turn", "review_revision"]),
    document: documentStateSchema,
    createdAt: z.string().datetime(),
  })
  .strict();

export type WritingStyle = z.infer<typeof writingStyleSchema>;
export type DocumentMeta = z.infer<typeof documentMetaSchema>;
export type HeadingStyle = z.infer<typeof headingStyleSchema>;
export type ParagraphStyle = z.infer<typeof paragraphStyleSchema>;
export type ListStyle = z.infer<typeof listStyleSchema>;
export type TableStyle = z.infer<typeof tableStyleSchema>;
export type QuoteStyle = z.infer<typeof quoteStyleSchema>;
export type CalloutStyle = z.infer<typeof calloutStyleSchema>;
export type DividerStyle = z.infer<typeof dividerStyleSchema>;
export type TableColumn = z.infer<typeof tableColumnSchema>;
export type DocumentNode = z.infer<typeof documentNodeSchema>;
export type DocumentState = z.infer<typeof documentStateSchema>;
export type DocumentCheckpoint = z.infer<typeof documentCheckpointSchema>;
