"use client";

import { pdf } from "@react-pdf/renderer";
import type { DocumentState } from "@/contracts";
import { slugifyFilename } from "@/lib/pdf-filename";
import { DocumentRenderer } from "@/pdf/components/DocumentRenderer";

/** @deprecated Prefer createSessionPdfPort().render — kept for local preview helpers. */
export async function renderFakePdfBlob(
  document: DocumentState,
): Promise<Blob> {
  return pdf(<DocumentRenderer document={document} />).toBlob();
}

export function downloadFileName(title: string, version = 0): string {
  return slugifyFilename(title, version);
}
