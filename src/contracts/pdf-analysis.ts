import { z } from "zod";
import {
  analysisDocumentIdSchema,
  documentIdSchema,
  nodeIdSchema,
  pdfTextSpanIdSchema,
} from "./ids";
import { documentOutlineSchema } from "./outline";

export const analyzablePdfOriginSchema = z.enum([
  "uploaded_pdf",
  "ordino_generated_pdf",
]);

export const generatedNodeTextDigestSchema = z
  .object({
    nodeId: nodeIdSchema,
    type: z.string().min(1),
    text: z.string().max(4_000),
  })
  .strict();

export const generatedDocumentContextSchema = z
  .object({
    documentId: documentIdSchema,
    documentVersion: z.number().int().nonnegative(),
    title: z.string().min(1).max(200),
    documentType: z.string().min(1).max(120),
    audience: z.string().min(1).max(200),
    outline: documentOutlineSchema,
    nodeTextDigest: z.array(generatedNodeTextDigestSchema),
  })
  .strict();

export const analyzablePdfInputSchema = z
  .object({
    analysisDocumentId: analysisDocumentIdSchema,
    origin: analyzablePdfOriginSchema,
    fileName: z.string().min(1).max(255),
    pdfBlob: z.instanceof(Blob),
    generatedDocumentContext: generatedDocumentContextSchema.nullable(),
  })
  .strict();

export const analysisPageImageSchema = z
  .object({
    mimeType: z.literal("image/png"),
    dataUrl: z.string().startsWith("data:image/png"),
    widthPx: z.number().int().positive(),
    heightPx: z.number().int().positive(),
  })
  .strict();

export const pdfTextSpanSchema = z
  .object({
    id: pdfTextSpanIdSchema,
    pageNumber: z.number().int().positive(),
    text: z.string(),
    x: z.number(),
    y: z.number(),
    width: z.number().nonnegative(),
    height: z.number().nonnegative(),
    fontName: z.string().nullable(),
    fontSize: z.number().nullable(),
  })
  .strict();

export const analysisPageSchema = z
  .object({
    pageNumber: z.number().int().positive(),
    widthPx: z.number().int().positive(),
    heightPx: z.number().int().positive(),
    image: analysisPageImageSchema,
    rawText: z.string(),
    textSpans: z.array(pdfTextSpanSchema),
  })
  .strict();

export const analysisDocumentSchema = z
  .object({
    schemaVersion: z.literal(1),
    analysisDocumentId: analysisDocumentIdSchema,
    origin: analyzablePdfOriginSchema,
    fileName: z.string().min(1).max(255),
    pageCount: z.number().int().positive(),
    pages: z.array(analysisPageSchema).min(1),
    generatedDocumentContext: generatedDocumentContextSchema.nullable(),
    createdAt: z.string().datetime(),
  })
  .strict();

export const pdfTextSpanDigestSchema = z
  .object({
    id: pdfTextSpanIdSchema,
    text: z.string(),
  })
  .strict();

export const pdfAnalysisPageInputSchema = z
  .object({
    pageNumber: z.number().int().positive(),
    imageDataUrl: z.string().startsWith("data:image/"),
    rawText: z.string(),
    textSpanDigest: z.array(pdfTextSpanDigestSchema),
  })
  .strict();

export const pdfAnalysisRequestSchema = z
  .object({
    analysisDocumentId: analysisDocumentIdSchema,
    origin: analyzablePdfOriginSchema,
    targetLanguage: z.string().trim().min(2).max(64),
    pages: z.array(pdfAnalysisPageInputSchema).min(1).max(3),
    generatedDocumentContext: generatedDocumentContextSchema.nullable(),
    userGoal: z.string().trim().min(1).max(2_000).nullable(),
  })
  .strict();

export const highlightKindSchema = z.enum([
  "deadline",
  "money",
  "signature",
  "obligation",
  "risk",
  "right",
  "termination",
  "required_action",
  "other",
]);

export const highlightSeveritySchema = z.enum([
  "info",
  "important",
  "critical",
]);

export const rawHighlightSchema = z
  .object({
    pageNumber: z.number().int().positive(),
    kind: highlightKindSchema,
    severity: highlightSeveritySchema,
    sourceText: z.string().min(1).max(4_000),
    candidateSpanIds: z.array(z.string()).default([]),
    candidateNodeIds: z.array(z.string()).default([]),
    plainLanguageText: z.string().min(1).max(4_000),
    translatedText: z.string().min(1).max(4_000),
    narrationText: z.string().min(1).max(4_000),
    reason: z.string().min(1).max(2_000),
    confidence: z.number().min(0).max(1),
  })
  .strict();

export const rawPdfAnalysisResponseSchema = z
  .object({
    highlights: z.array(rawHighlightSchema),
    summary: z.string().min(1).max(8_000).nullable().optional(),
    topDeadlines: z.array(z.string()).optional(),
    topRequiredActions: z.array(z.string()).optional(),
    criticalRisks: z.array(z.string()).optional(),
  })
  .strict();

export type AnalyzablePdfOrigin = z.infer<typeof analyzablePdfOriginSchema>;
export type GeneratedNodeTextDigest = z.infer<
  typeof generatedNodeTextDigestSchema
>;
export type GeneratedDocumentContext = z.infer<
  typeof generatedDocumentContextSchema
>;
export type AnalyzablePdfInput = z.infer<typeof analyzablePdfInputSchema>;
export type AnalysisPageImage = z.infer<typeof analysisPageImageSchema>;
export type PdfTextSpan = z.infer<typeof pdfTextSpanSchema>;
export type AnalysisPage = z.infer<typeof analysisPageSchema>;
export type AnalysisDocument = z.infer<typeof analysisDocumentSchema>;
export type PdfTextSpanDigest = z.infer<typeof pdfTextSpanDigestSchema>;
export type PdfAnalysisPageInput = z.infer<typeof pdfAnalysisPageInputSchema>;
export type PdfAnalysisRequest = z.infer<typeof pdfAnalysisRequestSchema>;
export type HighlightKind = z.infer<typeof highlightKindSchema>;
export type HighlightSeverity = z.infer<typeof highlightSeveritySchema>;
export type RawHighlight = z.infer<typeof rawHighlightSchema>;
export type RawPdfAnalysisResponse = z.infer<
  typeof rawPdfAnalysisResponseSchema
>;
