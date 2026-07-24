import { pdf } from "@react-pdf/renderer";
import DocumentRenderer from "../components/DocumentRenderer";
import { registerDefaultFonts } from "../fonts";
import type { DocumentState } from "../../contracts/document";
import type { InternalRenderResult } from "../../contracts/rendering";

export async function renderDocumentToPdf(
  document: DocumentState,
  signal?: AbortSignal,
): Promise<
  { success: true; data: InternalRenderResult } | { success: false; error: any }
> {
  try {
    registerDefaultFonts();

    const docElement = <DocumentRenderer document={document} />;

    const pdfInstance = pdf(docElement);
    // @react-pdf/renderer exposes toBuffer in Node environments
    const buf: any = await pdfInstance.toBuffer();

    // Convert Buffer/Uint8Array to ArrayBuffer for Blob compatibility
    let arrayBuffer: ArrayBuffer;
    if (typeof Buffer !== "undefined" && Buffer.isBuffer(buf)) {
      arrayBuffer = buf.buffer.slice(
        buf.byteOffset,
        buf.byteOffset + buf.byteLength,
      );
    } else if (buf instanceof Uint8Array) {
      arrayBuffer = buf.buffer.slice(
        buf.byteOffset,
        buf.byteOffset + buf.byteLength,
      );
    } else {
      const tmp = Uint8Array.from(buf as any);
      arrayBuffer = tmp.buffer.slice(
        tmp.byteOffset,
        tmp.byteOffset + tmp.byteLength,
      );
    }
    const blob = new Blob([arrayBuffer], { type: "application/pdf" });
    // Count pages by splitting on explicit page_break nodes (same logic as renderer)
    let pageCount = 1;
    for (const n of document.nodes) {
      if (n.type === "page_break") pageCount++;
    }

    const result: InternalRenderResult = {
      documentId: document.documentId,
      documentVersion: document.version,
      pdfBlob: blob,
      pageCount,
      renderedAt: new Date().toISOString(),
    } as any;

    return { success: true, data: result };
  } catch (err: any) {
    return {
      success: false,
      error: { code: "RENDER_FAILED", message: String(err), retryable: false },
    };
  }
}

export default renderDocumentToPdf;
