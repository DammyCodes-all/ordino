import { z } from "zod";

const brandedUuid = <T extends string>(_brand: T) =>
  z.string().uuid().brand<T>();

export const documentIdSchema = brandedUuid("DocumentId");
export const nodeIdSchema = brandedUuid("NodeId");
export const referenceImageIdSchema = brandedUuid("ReferenceImageId");
export const checkpointIdSchema = brandedUuid("CheckpointId");
export const messageIdSchema = brandedUuid("MessageId");
export const analysisDocumentIdSchema = brandedUuid("AnalysisDocumentId");
export const pdfTextSpanIdSchema = brandedUuid("PdfTextSpanId");
export const highlightIdSchema = brandedUuid("HighlightId");
export const narrationSegmentIdSchema = brandedUuid("NarrationSegmentId");

export type DocumentId = z.infer<typeof documentIdSchema>;
export type NodeId = z.infer<typeof nodeIdSchema>;
export type ReferenceImageId = z.infer<typeof referenceImageIdSchema>;
export type CheckpointId = z.infer<typeof checkpointIdSchema>;
export type MessageId = z.infer<typeof messageIdSchema>;
export type AnalysisDocumentId = z.infer<typeof analysisDocumentIdSchema>;
export type PdfTextSpanId = z.infer<typeof pdfTextSpanIdSchema>;
export type HighlightId = z.infer<typeof highlightIdSchema>;
export type NarrationSegmentId = z.infer<typeof narrationSegmentIdSchema>;
