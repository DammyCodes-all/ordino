import {
  extractText,
  extractTextItems,
  getDocumentProxy,
  renderPageAsImage,
} from "unpdf";
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

function arrayBufferToPngDataUrl(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const base64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(bytes).toString("base64");
  return `data:image/png;base64,${base64}`;
}

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

/**
 * Local PDF ingest with `unpdf` (text + spans) and page image rendering.
 * Browser-safe: uses DOM canvas; Node can still call this if a canvas polyfill exists,
 * or prefer the API ingest route for server-side runs.
 */
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
      const viewport = page.getViewport({ scale: 1 });
      const widthPx = Math.ceil(viewport.width * RENDER_SCALE);
      const heightPx = Math.ceil(viewport.height * RENDER_SCALE);

      let dataUrl: string;
      try {
        const isNode = typeof document === "undefined";
        const image = await renderPageAsImage(pdf, pageNumber, {
          scale: RENDER_SCALE,
          toDataURL: true,
          ...(isNode ? { canvasImport: () => import("@napi-rs/canvas") } : {}),
        });
        dataUrl =
          typeof image === "string" ? image : arrayBufferToPngDataUrl(image);
        if (!dataUrl.startsWith("data:")) {
          dataUrl = `data:image/png;base64,${dataUrl}`;
        }
      } catch (error) {
        // Browser fallback: render via PDF.js + DOM canvas.
        if (typeof document !== "undefined") {
          const scaled = page.getViewport({ scale: RENDER_SCALE });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(scaled.width);
          canvas.height = Math.ceil(scaled.height);
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
          dataUrl = canvas.toDataURL("image/png");
        } else {
          return createErrorResult(
            "PAGE_RENDER_FAILED",
            `Failed to render page ${pageNumber}.`,
            true,
            {
              reason: error instanceof Error ? error.message : String(error),
            },
          );
        }
      }

      const rawText = textByPage.text[pageNumber - 1] ?? "";
      const pageItems = itemsByPage.items[pageNumber - 1] ?? [];
      const textSpans = normalizeSpans(
        pageNumber,
        pageItems,
        viewport.width,
        viewport.height,
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
