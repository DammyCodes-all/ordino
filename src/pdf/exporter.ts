import type { DocumentState } from "../contracts/document";
import type {
  ExportResult,
  InternalRenderResult,
} from "../contracts/rendering";
import { getCachedRender, setCachedRender } from "./cache";
import { renderDocumentToPdf } from "./render/headless";
import { validatePdf } from "./validate-pdf";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function exportDocument(
  document: DocumentState,
  existingRender?: InternalRenderResult | undefined,
): Promise<
  { success: true; data: ExportResult } | { success: false; error: any }
> {
  try {
    const key = `${document.documentId}:${document.version}`;
    let render: InternalRenderResult | undefined;

    if (existingRender) {
      const cached = getCachedRender(key);
      if (
        cached &&
        cached.documentId === document.documentId &&
        cached.documentVersion === document.version
      ) {
        render = cached;
      }
    }

    if (!render) {
      const r = await renderDocumentToPdf(document);
      if (!r.success) return { success: false, error: r.error };
      render = r.data;
      setCachedRender(key, render);
    }

    const validation = await validatePdf(document, render);

    const filename = `${slugify(document.meta.title || "document")}-v${document.version}.pdf`;
    return {
      success: true,
      data: {
        documentId: document.documentId,
        documentVersion: document.version,
        filename,
        blob: render.pdfBlob,
        validation,
      } as any,
    };
  } catch (err: any) {
    return {
      success: false,
      error: { code: "RENDER_FAILED", message: String(err), retryable: false },
    };
  }
}

export default exportDocument;
