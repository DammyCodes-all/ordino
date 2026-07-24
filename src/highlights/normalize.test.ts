import { describe, expect, it } from "vitest";
import type { AnalysisDocument, RawPdfAnalysisResponse } from "@/contracts";
import { normalizeHighlights } from "@/highlights/normalize";

const analysisId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const spanId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("normalizeHighlights", () => {
  it("matches candidate span ids and builds boxes", () => {
    const analysis = {
      schemaVersion: 1,
      analysisDocumentId: analysisId,
      origin: "uploaded_pdf",
      fileName: "demo.pdf",
      pageCount: 1,
      pages: [
        {
          pageNumber: 1,
          widthPx: 800,
          heightPx: 1100,
          image: {
            mimeType: "image/png",
            dataUrl: "data:image/png;base64,xx",
            widthPx: 800,
            heightPx: 1100,
          },
          rawText: "Payment is due by March 1.",
          textSpans: [
            {
              id: spanId,
              pageNumber: 1,
              text: "Payment is due by March 1.",
              x: 40,
              y: 100,
              width: 240,
              height: 18,
              fontName: null,
              fontSize: 12,
            },
          ],
        },
      ],
      generatedDocumentContext: null,
      createdAt: new Date().toISOString(),
    } as unknown as AnalysisDocument;

    const raw: RawPdfAnalysisResponse = {
      highlights: [
        {
          pageNumber: 1,
          kind: "deadline",
          severity: "important",
          sourceText: "Payment is due by March 1.",
          candidateSpanIds: [spanId],
          candidateNodeIds: [],
          plainLanguageText: "You must pay by March 1.",
          translatedText: "Debes pagar antes del 1 de marzo.",
          narrationText: "You must pay by March 1.",
          reason: "Deadline.",
          confidence: 0.92,
        },
      ],
      summary: "One deadline.",
    };

    const result = normalizeHighlights(
      analysis.analysisDocumentId,
      analysis,
      raw,
      "es",
    );

    expect(result.highlights).toHaveLength(1);
    expect(result.highlights[0]?.matchedSpanIds).toEqual([spanId]);
    expect(result.highlights[0]?.boundingBoxes).toHaveLength(1);
    expect(result.narration.segments.length).toBeGreaterThan(0);
  });

  it("keeps side-panel highlight when span match fails", () => {
    const analysis = {
      schemaVersion: 1,
      analysisDocumentId: analysisId,
      origin: "uploaded_pdf",
      fileName: "demo.pdf",
      pageCount: 1,
      pages: [
        {
          pageNumber: 1,
          widthPx: 800,
          heightPx: 1100,
          image: {
            mimeType: "image/png",
            dataUrl: "data:image/png;base64,xx",
            widthPx: 800,
            heightPx: 1100,
          },
          rawText: "Hello",
          textSpans: [],
        },
      ],
      generatedDocumentContext: null,
      createdAt: new Date().toISOString(),
    } as unknown as AnalysisDocument;

    const raw: RawPdfAnalysisResponse = {
      highlights: [
        {
          pageNumber: 1,
          kind: "risk",
          severity: "critical",
          sourceText: "unmatched clause",
          candidateSpanIds: [],
          candidateNodeIds: [],
          plainLanguageText: "This may be risky.",
          translatedText: "Esto puede ser riesgoso.",
          narrationText: "This may be risky.",
          reason: "Risk language.",
          confidence: 0.5,
        },
      ],
    };

    const result = normalizeHighlights(
      analysis.analysisDocumentId,
      analysis,
      raw,
      "es",
    );
    expect(result.highlights).toHaveLength(1);
    expect(result.highlights[0]?.boundingBoxes).toEqual([]);
  });
});
