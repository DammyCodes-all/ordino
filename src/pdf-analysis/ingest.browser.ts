"use client";

import { extractText, extractTextItems, getDocumentProxy } from "unpdf";
import type {
  AnalysisDocument,
  AnalysisPage,
  AnalyzablePdfInput,
  AppResult,
  PdfTextSpan,
} from "@/contracts";
import { createErrorResult, createSuccessResult } from "@/google-ai";
import { createId } from "@/lib/document-factory";

const RENDER_SCALE = 2;

function normalizeSpans(
  pageNumber: number,
  items: Array<{
    str: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    fontFamily: string;
  }>,
  pageWidthPts: number,
  pageHeightPts: number,
  imageWidth: number,
  imageHeight: number,
): PdfTextSpan[] {
  const spans: PdfTextSpan[] = [];
  for (const item of items) {
    const text = item.str?.trim() ?? "";
    if (!text) continue;

    const heightPts = item.height || item.fontSize || 10;
    const x = (item.x / pageWidthPts) * imageWidth;
    const y =
      ((pageHeightPts - item.y - heightPts) / pageHeightPts) * imageHeight;
    const width = (item.width / pageWidthPts) * imageWidth;
    const height = (heightPts / pageHeightPts) * imageHeight;

    spans.push({
      id: createId("span"),
      pageNumber,
      text,
      x,
      y,
      width: Math.max(0, width),
      height: Math.max(0, height),
      fontName: item.fontFamily || null,
      fontSize: item.fontSize || null,
    });
  }
  return spans;
}

/** Browser-safe ingest: `unpdf` for text/spans, DOM canvas for page images. */
export async function ingestAnalyzablePdf(
  input: AnalyzablePdfInput,
  signal?: AbortSignal,
  options?: { maxPages?: number },
): Promise<AppResult<AnalysisDocument>> {
  try {
    if (signal?.aborted) {
      return createErrorResult("ABORTED", "Ingest aborted.", false);
    }

    const bytes = new Uint8Array(await input.pdfBlob.arrayBuffer());
    if (bytes.byteLength === 0) {
      return createErrorResult("INVALID_PDF", "PDF file is empty.", false);
    }

    let pdf: Awaited<ReturnType<typeof getDocumentProxy>>;
    try {
      pdf = await getDocumentProxy(bytes);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/password|encrypt/i.test(message)) {
        return createErrorResult(
          "ENCRYPTED_PDF",
          "Encrypted PDFs are not supported.",
          false,
        );
      }
      return createErrorResult(
        "INVALID_PDF",
        "Could not open PDF file.",
        false,
        { reason: message },
      );
    }

    if (!pdf.numPages || pdf.numPages < 1) {
      return createErrorResult("INVALID_PDF", "PDF has no pages.", false);
    }

    const maxPages = Math.min(pdf.numPages, options?.maxPages ?? pdf.numPages);
    const textByPage = await extractText(pdf, { mergePages: false });
    const itemsByPage = await extractTextItems(pdf);
    const pages: AnalysisPage[] = [];

    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
      if (signal?.aborted) {
        return createErrorResult("ABORTED", "Ingest aborted.", false);
      }

      const page = await pdf.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const scaled = page.getViewport({ scale: RENDER_SCALE });
      const widthPx = Math.ceil(scaled.width);
      const heightPx = Math.ceil(scaled.height);

      const canvas = document.createElement("canvas");
      canvas.width = widthPx;
      canvas.height = heightPx;
      const context = canvas.getContext("2d");
      if (!context) {
        return createErrorResult(
          "PAGE_RENDER_FAILED",
          `Failed to render page ${pageNumber}.`,
          true,
        );
      }

      await page.render({
        canvasContext: context,
        viewport: scaled,
        canvas,
      }).promise;

      const dataUrl = canvas.toDataURL("image/png");
      const rawText = textByPage.text[pageNumber - 1] ?? "";
      const pageItems = itemsByPage.items[pageNumber - 1] ?? [];
      const textSpans = normalizeSpans(
        pageNumber,
        pageItems,
        baseViewport.width,
        baseViewport.height,
        widthPx,
        heightPx,
      );

      pages.push({
        pageNumber,
        widthPx,
        heightPx,
        image: {
          mimeType: "image/png",
          dataUrl,
          widthPx,
          heightPx,
        },
        rawText,
        textSpans,
      });
    }

    return createSuccessResult({
      schemaVersion: 1,
      analysisDocumentId: input.analysisDocumentId,
      origin: input.origin,
      fileName: input.fileName,
      pageCount: pages.length,
      pages,
      generatedDocumentContext: input.generatedDocumentContext,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    return createErrorResult(
      "EXTRACTION_FAILED",
      error instanceof Error ? error.message : "PDF extraction failed.",
      true,
    );
  }
}
