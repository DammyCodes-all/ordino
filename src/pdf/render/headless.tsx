import { pdf } from "@react-pdf/renderer";
import { DocumentRenderer } from "../components/DocumentRenderer";
import { registerDefaultFonts } from "../fonts";
import type { DocumentState } from "../../contracts/document";
import type { InternalRenderResult } from "../../contracts/rendering";


export async function renderDocumentToPdf(
  document: DocumentState,
  signal?: AbortSignal,
): Promise<{ success: true; data: InternalRenderResult } | { success: false; error: any }> {
  try {
    registerDefaultFonts();

    const docElement = <DocumentRenderer document={document} />;

    const pdfInstance = pdf(docElement);
    // @react-pdf/renderer exposes toBuffer in Node environments
    const buffer: Buffer = await pdfInstance.toBuffer();

    // Convert Buffer to Blob for contract compatibility
    const blob = new Blob([buffer], { type: "application/pdf" });
    const result: InternalRenderResult = {
      documentId: document.documentId,
      documentVersion: document.version,
      pdfBlob: blob,
      pageCount: 1,
      renderedAt: new Date().toISOString(),
    } as any;

    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: { code: "RENDER_FAILED", message: String(err), retryable: false } };
  }
}

export default renderDocumentToPdf;
