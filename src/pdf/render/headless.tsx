import { pdf } from "@react-pdf/renderer";
import type { DocumentState } from "../../contracts/document";
import type { InternalRenderResult } from "../../contracts/rendering";
import type { AppError } from "../../contracts/result";
import {
  chunkByPageBreaks,
  DocumentRenderer,
} from "../components/DocumentRenderer";
import { registerDefaultFonts } from "../fonts";

export async function renderDocumentToPdf(
  document: DocumentState,
  signal?: AbortSignal,
): Promise<
  | { success: true; data: InternalRenderResult }
  | { success: false; error: AppError }
> {
  try {
    if (signal?.aborted) {
      return {
        success: false,
        error: { code: "ABORTED", message: "Render aborted", retryable: false },
      };
    }
    registerDefaultFonts();

    const pdfInstance = pdf(<DocumentRenderer document={document} />);
    const blob = await pdfInstance.toBlob();

    if (signal?.aborted) {
      return {
        success: false,
        error: { code: "ABORTED", message: "Render aborted", retryable: false },
      };
    }

    const pages = chunkByPageBreaks(document.nodes);
    const result: InternalRenderResult = {
      documentId: document.documentId,
      documentVersion: document.version,
      pdfBlob: blob,
      pageCount: Math.max(1, pages.length),
      renderedAt: new Date().toISOString(),
    };

    return { success: true, data: result };
  } catch (err: unknown) {
    return {
      success: false,
      error: {
        code: "RENDER_FAILED",
        message: err instanceof Error ? err.message : String(err),
        retryable: false,
      },
    };
  }
}

export default renderDocumentToPdf;
