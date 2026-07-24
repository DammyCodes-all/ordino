"use client";

import type {
  AppResult,
  InternalRenderResult,
  RasterizedPage,
} from "@/contracts";
import { createErrorResult, createSuccessResult } from "@/google-ai";

/** Browser rasterize fallback when `/api/pdf/rasterize` lacks Node canvas. */
export async function rasterizePdfInBrowser(
  render: InternalRenderResult,
  signal?: AbortSignal,
): Promise<AppResult<RasterizedPage[]>> {
  if (signal?.aborted) {
    return createErrorResult("ABORTED", "Rasterize aborted.", false);
  }

  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();

    const data = new Uint8Array(await render.pdfBlob.arrayBuffer());
    const loadingTask = pdfjs.getDocument({ data });
    const pdf = await loadingTask.promise;
    const pages: RasterizedPage[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      if (signal?.aborted) {
        return createErrorResult("ABORTED", "Rasterize aborted.", false);
      }

      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) {
        return createErrorResult(
          "RASTERIZATION_FAILED",
          "Canvas 2D context unavailable.",
          false,
        );
      }

      await page.render({
        canvasContext: context,
        viewport,
        canvas,
      }).promise;

      pages.push({
        documentVersion: render.documentVersion,
        pageNumber,
        mimeType: "image/png",
        dataUrl: canvas.toDataURL("image/png"),
        widthPx: canvas.width,
        heightPx: canvas.height,
      });
    }

    return createSuccessResult(pages);
  } catch (error) {
    return createErrorResult(
      "RASTERIZATION_FAILED",
      error instanceof Error ? error.message : String(error),
      true,
    );
  }
}
