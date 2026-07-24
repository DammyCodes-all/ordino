import { createSuccessResult } from "@/google-ai";
import { fromUploadedPdf } from "@/pdf-analysis/adapters";
import { ingestAnalyzablePdf } from "@/pdf-analysis/ingest";
import type { AnalysisDocument, AppResult } from "@/contracts";
import { PDFDocument, rgb } from "pdf-lib";

/**
 * Fixture-friendly smoke: build a tiny PDF, ingest page 1, assert text + image.
 */
export async function ingestSmokeFixture(): Promise<
  AppResult<{ pageCount: number; rawText: string; spanCount: number }>
> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([400, 560]);
  page.drawText("Payment is due by March 1.", {
    x: 48,
    y: 480,
    size: 14,
    color: rgb(0.1, 0.1, 0.1),
  });
  page.drawText("Sign here to accept the terms.", {
    x: 48,
    y: 440,
    size: 12,
    color: rgb(0.1, 0.1, 0.1),
  });
  const bytes = await pdf.save();
  const blob = new Blob([bytes.buffer as ArrayBuffer], {
    type: "application/pdf",
  });
  const file = new File([blob], "fixture.pdf", { type: "application/pdf" });
  const input = fromUploadedPdf(file);
  const ingested = await ingestAnalyzablePdf(input, undefined, { maxPages: 1 });
  if (!ingested.success) return ingested;

  const doc: AnalysisDocument = ingested.data;
  return createSuccessResult({
    pageCount: doc.pageCount,
    rawText: doc.pages[0]?.rawText ?? "",
    spanCount: doc.pages[0]?.textSpans.length ?? 0,
  });
}
