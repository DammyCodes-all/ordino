import type {
  AnalysisDocument,
  AppResult,
  DocumentAnalysisSummary,
  DocumentHighlight,
  NarrationPlaylist,
  PdfAnalysisRequest,
  RawPdfAnalysisResponse,
} from "@/contracts";
import { createErrorResult, createSuccessResult } from "@/google-ai";
import { normalizeHighlights } from "@/highlights/normalize";

export type PdfAnalysisRunResult = {
  highlights: DocumentHighlight[];
  summary: DocumentAnalysisSummary;
  narration: NarrationPlaylist;
  raw: RawPdfAnalysisResponse;
};

export async function analyzeAnalysisDocument(
  analysis: AnalysisDocument,
  targetLanguage: string,
  userGoal: string | null,
  signal?: AbortSignal,
  options?: { maxPagesPerBatch?: number },
): Promise<AppResult<PdfAnalysisRunResult>> {
  const batchSize = options?.maxPagesPerBatch ?? 2;
  const allHighlights: DocumentHighlight[] = [];
  let summary: DocumentAnalysisSummary = {
    summary: null,
    topDeadlines: [],
    topRequiredActions: [],
    criticalRisks: [],
  };
  let narration: NarrationPlaylist = {
    language: targetLanguage,
    segments: [],
  };
  let lastRaw: RawPdfAnalysisResponse = { highlights: [] };

  for (let i = 0; i < analysis.pages.length; i += batchSize) {
    if (signal?.aborted) {
      return createErrorResult("ABORTED", "Analysis aborted.", false);
    }

    const batchPages = analysis.pages.slice(i, i + batchSize);
    const request: PdfAnalysisRequest = {
      analysisDocumentId: analysis.analysisDocumentId,
      origin: analysis.origin,
      targetLanguage,
      pages: batchPages.map((page) => ({
        pageNumber: page.pageNumber,
        imageDataUrl: page.image.dataUrl,
        rawText: page.rawText,
        textSpanDigest: page.textSpans.map((span) => ({
          id: span.id,
          text: span.text,
        })),
      })),
      generatedDocumentContext: analysis.generatedDocumentContext,
      userGoal,
    };

    const response = await fetch("/api/ai/pdf-analysis/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });

    const payload =
      (await response.json()) as AppResult<RawPdfAnalysisResponse>;
    if (!payload.success) {
      // Keep partial results if we already have some pages.
      if (allHighlights.length > 0) {
        break;
      }
      return payload;
    }

    lastRaw = payload.data;
    const normalized = normalizeHighlights(
      analysis.analysisDocumentId,
      analysis,
      payload.data,
      targetLanguage,
    );
    allHighlights.push(...normalized.highlights);
    summary = {
      summary: normalized.summary.summary ?? summary.summary,
      topDeadlines: [
        ...summary.topDeadlines,
        ...normalized.summary.topDeadlines,
      ],
      topRequiredActions: [
        ...summary.topRequiredActions,
        ...normalized.summary.topRequiredActions,
      ],
      criticalRisks: [
        ...summary.criticalRisks,
        ...normalized.summary.criticalRisks,
      ],
    };
    narration = {
      language: targetLanguage,
      segments: [...narration.segments, ...normalized.narration.segments].map(
        (segment, order) => ({ ...segment, order }),
      ),
    };
  }

  return createSuccessResult({
    highlights: allHighlights,
    summary,
    narration,
    raw: lastRaw,
  });
}
