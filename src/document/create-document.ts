import { z } from "zod";
import { DocumentMeta, documentStateSchema } from "../contracts/document";
import { documentIdSchema, nodeIdSchema } from "../contracts/ids";

export function createDocument(meta: DocumentMeta) {
  // Normalize strings (trim) and preserve pageLimit null
  const normalizedMeta = {
    ...meta,
    title: meta.title.trim(),
    documentType: meta.documentType.trim(),
    audience: meta.audience.trim(),
    instructions: meta.instructions === null ? null : meta.instructions.trim(),
  } as DocumentMeta;

  const document = {
    schemaVersion: 1,
    documentId: crypto.randomUUID(),
    version: 0,
    reviewRevision: 0,
    meta: normalizedMeta,
    nodes: [] as any[],
  };

  const parsed = documentStateSchema.safeParse(document);
  if (!parsed.success)
    throw new Error(
      "createDocument: generated document failed schema validation",
    );

  return parsed.data;
}

export default createDocument;
