import { z } from "zod";
import { documentIdSchema } from "./ids";
import type { DocumentState } from "./document";
import type { AppResult } from "./result";

export const internalRenderResultSchema = z
  .object({
    documentId: documentIdSchema,
    documentVersion: z.number().int().nonnegative(),
    pdfBlob: z.instanceof(Blob),
    pageCount: z.number().int().positive(),
    renderedAt: z.string().datetime(),
  })
  .strict();

export const rasterizedPageSchema = z
  .object({
    documentVersion: z.number().int().nonnegative(),
    pageNumber: z.number().int().positive(),
    mimeType: z.literal("image/png"),
    dataUrl: z.string().startsWith("data:image/png;base64,"),
    widthPx: z.number().int().positive(),
    heightPx: z.number().int().positive(),
  })
  .strict();

export const publishedPreviewSchema = z
  .object({
    documentId: documentIdSchema,
    documentVersion: z.number().int().nonnegative(),
    pdfUrl: z.string().min(1),
    publishedAt: z.string().datetime(),
  })
  .strict();

export const exportResultSchema = z
  .object({
    documentId: documentIdSchema,
    documentVersion: z.number().int().nonnegative(),
    filename: z.string().min(1).endsWith(".pdf"),
    blob: z.instanceof(Blob),
  })
  .strict();

export type InternalRenderResult = z.infer<typeof internalRenderResultSchema>;
export type RasterizedPage = z.infer<typeof rasterizedPageSchema>;
export type PublishedPreview = z.infer<typeof publishedPreviewSchema>;
export type ExportResult = z.infer<typeof exportResultSchema>;

export interface PdfPort {
  render(
    document: DocumentState,
    signal?: AbortSignal,
  ): Promise<AppResult<InternalRenderResult>>;
  rasterize(
    render: InternalRenderResult,
    signal?: AbortSignal,
  ): Promise<AppResult<RasterizedPage[]>>;
  export(
    document: DocumentState,
    existingRender?: InternalRenderResult,
    signal?: AbortSignal,
  ): Promise<AppResult<ExportResult>>;
}
