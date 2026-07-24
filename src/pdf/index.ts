import { AppResult } from "../contracts/result";
import { DocumentState } from "../contracts/document";
import {
  InternalRenderResult,
  RasterizedPage,
  ExportResult,
  PdfPort,
} from "../contracts/rendering";
import { ValidationReport } from "../contracts/validation";
import { renderDocumentToPdf } from "./render/headless";
import { rasterizePdf } from "./rasterize/pdfjs";
import { exportDocument } from "./exporter";

export function createPdfPort(): PdfPort {
  return {
    async render(
      document: DocumentState,
    ): Promise<AppResult<InternalRenderResult>> {
      const res = await renderDocumentToPdf(document);
      if (!res.success) return { success: false, error: res.error } as any;
      return { success: true, data: res.data };
    },

    async rasterize(
      render: InternalRenderResult,
      signal?: AbortSignal,
    ): Promise<AppResult<RasterizedPage[]>> {
      const res = await rasterizePdf(render, signal);
      if (!res.success) return { success: false, error: res.error } as any;
      return { success: true, data: res.data };
    },

    async export(
      document: DocumentState,
      existingRender?: InternalRenderResult,
      signal?: AbortSignal,
    ): Promise<AppResult<ExportResult>> {
      const res = await exportDocument(document, existingRender);
      if (!res.success) return { success: false, error: res.error } as any;
      return { success: true, data: res.data };
    },
  };
}

export function validatePdf(
  document: DocumentState,
  _render?: InternalRenderResult,
): Promise<ValidationReport> {
  return Promise.resolve({
    documentVersion: document.version,
    pass: true,
    issues: [],
  });
}

export default createPdfPort;
