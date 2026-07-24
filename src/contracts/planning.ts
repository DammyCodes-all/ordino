import { z } from "zod";

export const plannedSectionSchema = z
  .object({
    heading: z.string().trim().min(1).max(200),
    purpose: z.string().trim().min(1).max(1_000),
    estimatedParagraphs: z.number().int().min(0).max(20),
    includeTable: z.boolean(),
    includeList: z.boolean(),
  })
  .strict();

export const documentPlanSchema = z
  .object({
    summary: z.string().trim().min(1).max(2_000),
    sections: z.array(plannedSectionSchema).min(1).max(30),
  })
  .strict();

export type PlannedSection = z.infer<typeof plannedSectionSchema>;
export type DocumentPlan = z.infer<typeof documentPlanSchema>;
