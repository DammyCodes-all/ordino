import { z } from "zod";
import { nodeIdSchema } from "./ids";

export const visualIssueTypeSchema = z.enum([
  "overflow",
  "spacing",
  "alignment",
  "orphan_heading",
  "typography",
  "whitespace",
  "table_layout",
  "visual_hierarchy",
  "other",
]);

export const rawVisualIssueSchema = z
  .object({
    type: visualIssueTypeSchema,
    severity: z.enum(["warning", "error"]),
    pageNumber: z.number().int().positive(),
    reportedNodeId: z.string().nullable(),
    detail: z.string().trim().min(1).max(2_000),
    suggestedAction: z.string().trim().min(1).max(1_000).nullable(),
    confidence: z.number().min(0).max(1),
  })
  .strict();

export const rawVisualReviewSchema = z
  .object({
    pass: z.boolean(),
    issues: z.array(rawVisualIssueSchema),
  })
  .strict();

export const visualIssueSchema = rawVisualIssueSchema
  .omit({ reportedNodeId: true })
  .extend({ nodeId: nodeIdSchema.nullable() })
  .strict();

export const visualReviewResultSchema = z
  .object({
    documentVersion: z.number().int().nonnegative(),
    pass: z.boolean(),
    issues: z.array(visualIssueSchema),
  })
  .strict();

export type VisualIssueType = z.infer<typeof visualIssueTypeSchema>;
export type RawVisualIssue = z.infer<typeof rawVisualIssueSchema>;
export type RawVisualReview = z.infer<typeof rawVisualReviewSchema>;
export type VisualIssue = z.infer<typeof visualIssueSchema>;
export type VisualReviewResult = z.infer<typeof visualReviewResultSchema>;
