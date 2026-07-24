import type { DocumentState } from "../contracts/document";
import type {
  ExportResult,
  InternalRenderResult,
  PdfPort,
  RasterizedPage,
} from "../contracts/rendering";
import type { AppResult } from "../contracts/result";
import { exportDocument } from "./exporter";
import { rasterizePdf } from "./rasterize/pdfjs";
import { renderDocumentToPdf } from "./render/headless";

export { validatePdf } from "./validate-pdf";

export function createPdfPort(): PdfPort {
  return {
    async render(
      document: DocumentState,
      signal?: AbortSignal,
    ): Promise<AppResult<InternalRenderResult>> {
      const res = await renderDocumentToPdf(document, signal);
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

export default createPdfPort;
