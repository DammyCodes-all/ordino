import { z } from "zod";
import { nodeIdSchema } from "./ids";

export const validationIssueCodeSchema = z.enum([
  "EMPTY_TEXT_NODE",
  "HEADING_LEVEL_JUMP",
  "TRAILING_HEADING",
  "INVALID_PAGE_BREAK",
  "CONSECUTIVE_PAGE_BREAKS",
  "TABLE_COLUMN_MISMATCH",
  "EMPTY_TABLE_CELL",
  "PAGE_LIMIT_EXCEEDED",
  "BLANK_PAGE",
  "LOW_CONTENT_PAGE",
  "PDF_PARSE_FAILED",
]);

export const validationIssueSchema = z
  .object({
    source: z.enum(["document", "pdf"]),
    code: validationIssueCodeSchema,
    severity: z.enum(["warning", "error"]),
    message: z.string().min(1),
    nodeId: nodeIdSchema.nullable(),
    pageNumber: z.number().int().positive().nullable(),
  })
  .strict();

export const validationReportSchema = z
  .object({
    documentVersion: z.number().int().nonnegative(),
    pass: z.boolean(),
    issues: z.array(validationIssueSchema),
  })
  .strict();

export type ValidationIssueCode = z.infer<typeof validationIssueCodeSchema>;
export type ValidationIssue = z.infer<typeof validationIssueSchema>;
export type ValidationReport = z.infer<typeof validationReportSchema>;
