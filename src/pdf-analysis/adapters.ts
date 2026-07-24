import type {
  AnalyzablePdfInput,
  DocumentState,
  GeneratedDocumentContext,
  InternalRenderResult,
} from "@/contracts";
import { createId } from "@/lib/document-factory";

function nodeText(node: DocumentState["nodes"][number]): string {
  switch (node.type) {
    case "heading":
    case "paragraph":
    case "quote":
    case "callout":
      return node.text;
    case "list":
      return node.items.join(" ");
    case "table":
      return [
        ...node.columns.map((column) => column.header),
        ...node.rows.flat(),
      ].join(" ");
    default:
      return "";
  }
}

export function buildGeneratedDocumentContext(
  document: DocumentState,
  outline: GeneratedDocumentContext["outline"],
): GeneratedDocumentContext {
  return {
    documentId: document.documentId,
    documentVersion: document.version,
    title: document.meta.title,
    documentType: document.meta.documentType,
    audience: document.meta.audience,
    outline,
    nodeTextDigest: document.nodes
      .map((node) => ({
        nodeId: node.id,
        type: node.type,
        text: nodeText(node).slice(0, 4_000),
      }))
      .filter((entry) => entry.text.trim().length > 0),
  };
}

export function fromUploadedPdf(file: File): AnalyzablePdfInput {
  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    throw new Error("UNSUPPORTED_FILE_TYPE");
  }

  return {
    analysisDocumentId: createId("analysis"),
    origin: "uploaded_pdf",
    fileName: file.name.slice(0, 255) || "upload.pdf",
    pdfBlob: file,
    generatedDocumentContext: null,
  };
}

export function fromGeneratedPdf(
  document: DocumentState,
  render: InternalRenderResult,
  outline: GeneratedDocumentContext["outline"],
  fileName?: string,
): AnalyzablePdfInput {
  return {
    analysisDocumentId: createId("analysis"),
    origin: "ordino_generated_pdf",
    fileName:
      fileName?.slice(0, 255) ||
      `${document.meta.title.replace(/[^\w.-]+/g, "-").toLowerCase() || "document"}.pdf`,
    pdfBlob: render.pdfBlob,
    generatedDocumentContext: buildGeneratedDocumentContext(document, outline),
  };
}
