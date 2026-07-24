import { z } from "zod";
import {
  analysisDocumentIdSchema,
  highlightIdSchema,
  nodeIdSchema,
  pdfTextSpanIdSchema,
} from "./ids";
import { highlightKindSchema, highlightSeveritySchema } from "./pdf-analysis";

export const highlightBoundingBoxSchema = z
  .object({
    pageNumber: z.number().int().positive(),
    x: z.number(),
    y: z.number(),
    width: z.number().nonnegative(),
    height: z.number().nonnegative(),
  })
  .strict();

export const documentHighlightSchema = z
  .object({
    id: highlightIdSchema,
    analysisDocumentId: analysisDocumentIdSchema,
    pageNumber: z.number().int().positive(),
    kind: highlightKindSchema,
    severity: highlightSeveritySchema,
    sourceText: z.string().min(1).max(4_000),
    matchedSpanIds: z.array(pdfTextSpanIdSchema),
    relatedNodeIds: z.array(nodeIdSchema),
    boundingBoxes: z.array(highlightBoundingBoxSchema),
    plainLanguageText: z.string().min(1).max(4_000),
    translatedText: z.string().min(1).max(4_000),
    targetLanguage: z.string().min(2).max(64),
    reason: z.string().min(1).max(2_000),
    confidence: z.number().min(0).max(1),
  })
  .strict();

export const documentAnalysisSummarySchema = z
  .object({
    summary: z.string().min(1).max(8_000).nullable(),
    topDeadlines: z.array(z.string()),
    topRequiredActions: z.array(z.string()),
    criticalRisks: z.array(z.string()),
  })
  .strict();

export type HighlightBoundingBox = z.infer<typeof highlightBoundingBoxSchema>;
export type DocumentHighlight = z.infer<typeof documentHighlightSchema>;
export type DocumentAnalysisSummary = z.infer<
  typeof documentAnalysisSummarySchema
>;
