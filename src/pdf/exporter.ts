import type { DocumentState } from "../contracts/document";
import type {
  InternalRenderResult,
  ExportResult,
} from "../contracts/rendering";
import { renderDocumentToPdf } from "./render/headless";
import { getCachedRender, setCachedRender } from "./cache";

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
    if (existingRender) {
      const cached = getCachedRender(key);
      if (cached && cached.documentVersion === existingRender.documentVersion) {
        const filename = `${slugify(document.meta.title || "document")}-v${document.version}.pdf`;
        return {
          success: true,
          data: {
            documentId: document.documentId,
            documentVersion: document.version,
            filename,
            blob: cached.pdfBlob,
          } as any,
        };
      }
    }

    const r = await renderDocumentToPdf(document);
    if (!r.success) return { success: false, error: r.error };
    setCachedRender(key, r.data);

    const filename = `${slugify(document.meta.title || "document")}-v${document.version}.pdf`;
    return {
      success: true,
      data: {
        documentId: document.documentId,
        documentVersion: document.version,
        filename,
        blob: r.data.pdfBlob,
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
