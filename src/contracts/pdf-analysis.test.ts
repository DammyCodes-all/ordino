import { describe, expect, it } from "vitest";
import {
  analysisDocumentSchema,
  documentHighlightSchema,
  narrationSegmentSchema,
  pdfAnalysisRequestSchema,
  rawPdfAnalysisResponseSchema,
} from "@/contracts";

const analysisId = "11111111-1111-4111-8111-111111111111";
const spanId = "22222222-2222-4222-8222-222222222222";
const highlightId = "33333333-3333-4333-8333-333333333333";
const narrationId = "44444444-4444-4444-8444-444444444444";

describe("PDF analysis contracts", () => {
  it("validates an analysis document page", () => {
    const result = analysisDocumentSchema.safeParse({
      schemaVersion: 1,
      analysisDocumentId: analysisId,
      origin: "uploaded_pdf",
      fileName: "lease.pdf",
      pageCount: 1,
      pages: [
        {
          pageNumber: 1,
          widthPx: 800,
          heightPx: 1100,
          image: {
            mimeType: "image/png",
            dataUrl: "data:image/png;base64,abc",
            widthPx: 800,
            heightPx: 1100,
          },
          rawText: "Payment due by March 1.",
          textSpans: [
            {
              id: spanId,
              pageNumber: 1,
              text: "Payment due by March 1.",
              x: 40,
              y: 80,
              width: 220,
              height: 18,
              fontName: "Helvetica",
              fontSize: 12,
            },
          ],
        },
      ],
      generatedDocumentContext: null,
      createdAt: new Date().toISOString(),
    });

    expect(result.success).toBe(true);
  });

  it("validates an analysis request payload", () => {
    const result = pdfAnalysisRequestSchema.safeParse({
      analysisDocumentId: analysisId,
      origin: "ordino_generated_pdf",
      targetLanguage: "es",
      pages: [
        {
          pageNumber: 1,
          imageDataUrl: "data:image/png;base64,abc",
          rawText: "Sign here",
          textSpanDigest: [{ id: spanId, text: "Sign here" }],
        },
      ],
      generatedDocumentContext: null,
      userGoal: "Find signature requirements",
    });

    expect(result.success).toBe(true);
  });

  it("validates raw model analysis output", () => {
    const result = rawPdfAnalysisResponseSchema.safeParse({
      highlights: [
        {
          pageNumber: 1,
          kind: "deadline",
          severity: "important",
          sourceText: "due by March 1",
          candidateSpanIds: [spanId],
          candidateNodeIds: [],
          plainLanguageText: "You must pay by March 1.",
          translatedText: "Debe pagar antes del 1 de marzo.",
          narrationText: "You must pay by March 1.",
          reason: "This is a payment deadline.",
          confidence: 0.9,
        },
      ],
      summary: "One important deadline.",
    });

    expect(result.success).toBe(true);
  });

  it("validates a document highlight and narration segment", () => {
    const highlight = documentHighlightSchema.safeParse({
      id: highlightId,
      analysisDocumentId: analysisId,
      pageNumber: 1,
      kind: "money",
      severity: "critical",
      sourceText: "$500",
      matchedSpanIds: [spanId],
      relatedNodeIds: [],
      boundingBoxes: [{ pageNumber: 1, x: 10, y: 20, width: 40, height: 12 }],
      plainLanguageText: "You owe five hundred dollars.",
      translatedText: "Debes quinientos dólares.",
      targetLanguage: "es",
      reason: "Monetary amount.",
      confidence: 0.85,
    });
    const narration = narrationSegmentSchema.safeParse({
      id: narrationId,
      highlightId,
      pageNumber: 1,
      text: "You owe five hundred dollars.",
      language: "en",
      order: 0,
    });

    expect(highlight.success).toBe(true);
    expect(narration.success).toBe(true);
  });
});
