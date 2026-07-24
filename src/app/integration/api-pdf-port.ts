"use client";

import type {
  DocumentState,
  ExportResult,
  InternalRenderResult,
  PdfPort,
  RasterizedPage,
} from "@/contracts";
import { createErrorResult, createSuccessResult } from "@/google-ai";
import { base64ToBlob, blobToBase64, parseApiError } from "@/lib/base64";
import { rasterizePdfInBrowser } from "@/pdf/browser-rasterize";

function isRetryableStatus(status: number) {
  return status === 429 || status >= 500;
}

export class ApiPdfPort implements PdfPort {
  async render(
    document: DocumentState,
    signal?: AbortSignal,
  ): ReturnType<PdfPort["render"]> {
    try {
      const response = await fetch("/api/pdf/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document }),
        signal,
      });

      if (!response.ok) {
        const error = await parseApiError(response);
        return createErrorResult(
          (error.code as never) || "RENDER_FAILED",
          error.message,
          isRetryableStatus(response.status),
        );
      }

      const data = (await response.json()) as {
        documentId: InternalRenderResult["documentId"];
        documentVersion: number;
        pageCount: number;
        renderedAt: string;
        pdfBase64: string;
      };

      return createSuccessResult({
        documentId: data.documentId,
        documentVersion: data.documentVersion,
        pageCount: data.pageCount,
        renderedAt: data.renderedAt,
        pdfBlob: base64ToBlob(data.pdfBase64, "application/pdf"),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return createErrorResult("ABORTED", "Render aborted.", false);
      }
      return createErrorResult(
        "RENDER_FAILED",
        error instanceof Error ? error.message : String(error),
        true,
      );
    }
  }

  async rasterize(
    render: InternalRenderResult,
    signal?: AbortSignal,
  ): ReturnType<PdfPort["rasterize"]> {
    try {
      const pdfBase64 = await blobToBase64(render.pdfBlob);
      const response = await fetch("/api/pdf/rasterize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: render.documentId,
          documentVersion: render.documentVersion,
          pageCount: render.pageCount,
          renderedAt: render.renderedAt,
          pdfBase64,
        }),
        signal,
      });

      if (response.ok) {
        const data = (await response.json()) as { pages: RasterizedPage[] };
        return createSuccessResult(data.pages);
      }

      // Fall back to in-browser pdf.js when Node canvas is unavailable.
      if (response.status === 501 || response.status >= 500) {
        return rasterizePdfInBrowser(render, signal);
      }

      const error = await parseApiError(response);
      return createErrorResult(
        (error.code as never) || "RASTERIZATION_FAILED",
        error.message,
        isRetryableStatus(response.status),
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return createErrorResult("ABORTED", "Rasterize aborted.", false);
      }
      return rasterizePdfInBrowser(render, signal);
    }
  }

  async export(
    document: DocumentState,
    existingRender?: InternalRenderResult,
    signal?: AbortSignal,
  ): ReturnType<PdfPort["export"]> {
    try {
      const existing = existingRender
        ? {
            documentId: existingRender.documentId,
            documentVersion: existingRender.documentVersion,
            pageCount: existingRender.pageCount,
            renderedAt: existingRender.renderedAt,
            pdfBase64: await blobToBase64(existingRender.pdfBlob),
          }
        : undefined;

      const response = await fetch("/api/pdf/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document, existingRender: existing }),
        signal,
      });

      if (!response.ok) {
        const error = await parseApiError(response);
        return createErrorResult(
          (error.code as never) || "RENDER_FAILED",
          error.message,
          isRetryableStatus(response.status),
        );
      }

      const data = (await response.json()) as {
        documentId: ExportResult["documentId"];
        documentVersion: number;
        filename: string;
        pdfBase64: string;
      };

      return createSuccessResult({
        documentId: data.documentId,
        documentVersion: data.documentVersion,
        filename: data.filename,
        blob: base64ToBlob(data.pdfBase64, "application/pdf"),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return createErrorResult("ABORTED", "Export aborted.", false);
      }
      return createErrorResult(
        "RENDER_FAILED",
        error instanceof Error ? error.message : String(error),
        true,
      );
    }
  }
}

export function createApiPdfPort(): PdfPort {
  return new ApiPdfPort();
}
