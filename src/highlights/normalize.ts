import type {
  AnalysisDocument,
  AnalysisDocumentId,
  DocumentAnalysisSummary,
  DocumentHighlight,
  HighlightBoundingBox,
  NarrationPlaylist,
  NarrationSegment,
  NodeId,
  PdfTextSpan,
  PdfTextSpanId,
  RawHighlight,
  RawPdfAnalysisResponse,
} from "@/contracts";
import {
  highlightIdSchema,
  narrationSegmentIdSchema,
  nodeIdSchema,
  pdfTextSpanIdSchema,
} from "@/contracts";
import { createId } from "@/lib/document-factory";

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function mergeBoxes(boxes: HighlightBoundingBox[]): HighlightBoundingBox[] {
  if (boxes.length <= 1) return boxes;
  const byPage = new Map<number, HighlightBoundingBox[]>();
  for (const box of boxes) {
    const list = byPage.get(box.pageNumber) ?? [];
    list.push(box);
    byPage.set(box.pageNumber, list);
  }

  const merged: HighlightBoundingBox[] = [];
  for (const [pageNumber, pageBoxes] of byPage) {
    const minX = Math.min(...pageBoxes.map((b) => b.x));
    const minY = Math.min(...pageBoxes.map((b) => b.y));
    const maxX = Math.max(...pageBoxes.map((b) => b.x + b.width));
    const maxY = Math.max(...pageBoxes.map((b) => b.y + b.height));
    merged.push({
      pageNumber,
      x: minX,
      y: minY,
      width: Math.max(0, maxX - minX),
      height: Math.max(0, maxY - minY),
    });
  }
  return merged;
}

function matchSpans(
  sourceText: string,
  candidateSpanIds: string[],
  pageSpans: PdfTextSpan[],
): { matchedSpanIds: PdfTextSpanId[]; boxes: HighlightBoundingBox[] } {
  const byId = new Map(pageSpans.map((span) => [span.id, span]));
  const matched: PdfTextSpan[] = [];

  for (const rawId of candidateSpanIds) {
    const parsed = pdfTextSpanIdSchema.safeParse(rawId);
    if (!parsed.success) continue;
    const span = byId.get(parsed.data);
    if (span) matched.push(span);
  }

  if (matched.length === 0) {
    const needle = normalizeWhitespace(sourceText);
    if (needle) {
      const exact = pageSpans.filter(
        (span) => normalizeWhitespace(span.text) === needle,
      );
      if (exact.length > 0) {
        matched.push(...exact);
      } else {
        const fuzzy = pageSpans.filter((span) => {
          const hay = normalizeWhitespace(span.text);
          return hay.includes(needle) || needle.includes(hay);
        });
        matched.push(...fuzzy.slice(0, 8));
      }
    }
  }

  const unique = [...new Map(matched.map((span) => [span.id, span])).values()];
  const boxes = unique.map((span) => ({
    pageNumber: span.pageNumber,
    x: span.x,
    y: span.y,
    width: span.width,
    height: span.height,
  }));

  return {
    matchedSpanIds: unique.map((span) => span.id),
    boxes: mergeBoxes(boxes),
  };
}

function validNodeIds(
  candidateNodeIds: string[],
  allowed: Set<string>,
): NodeId[] {
  const out: NodeId[] = [];
  for (const raw of candidateNodeIds) {
    const parsed = nodeIdSchema.safeParse(raw);
    if (!parsed.success) continue;
    if (!allowed.has(parsed.data)) continue;
    out.push(parsed.data);
  }
  return out;
}

export function normalizeHighlights(
  analysisDocumentId: AnalysisDocumentId,
  analysis: AnalysisDocument,
  raw: RawPdfAnalysisResponse,
  targetLanguage: string,
): {
  highlights: DocumentHighlight[];
  summary: DocumentAnalysisSummary;
  narration: NarrationPlaylist;
} {
  const pageMap = new Map(
    analysis.pages.map((page) => [page.pageNumber, page]),
  );
  const allowedNodes = new Set(
    (analysis.generatedDocumentContext?.nodeTextDigest ?? []).map(
      (node) => node.nodeId,
    ),
  );

  const highlights: DocumentHighlight[] = [];
  const narrationSegments: NarrationSegment[] = [];

  raw.highlights.forEach((item: RawHighlight, index) => {
    const page = pageMap.get(item.pageNumber);
    if (!page) return;

    const { matchedSpanIds, boxes } = matchSpans(
      item.sourceText,
      item.candidateSpanIds,
      page.textSpans,
    );

    const id = highlightIdSchema.parse(crypto.randomUUID());
    const highlight: DocumentHighlight = {
      id,
      analysisDocumentId,
      pageNumber: item.pageNumber,
      kind: item.kind,
      severity: item.severity,
      sourceText: item.sourceText,
      matchedSpanIds,
      relatedNodeIds: validNodeIds(item.candidateNodeIds, allowedNodes),
      boundingBoxes: boxes,
      plainLanguageText: item.plainLanguageText,
      translatedText: item.translatedText,
      targetLanguage,
      reason: item.reason,
      confidence: item.confidence,
    };
    highlights.push(highlight);

    narrationSegments.push({
      id: narrationSegmentIdSchema.parse(crypto.randomUUID()),
      highlightId: id,
      pageNumber: item.pageNumber,
      text: item.narrationText || item.translatedText || item.plainLanguageText,
      language: targetLanguage,
      order: index,
    });
  });

  if (raw.summary) {
    narrationSegments.unshift({
      id: createId("narration"),
      highlightId: null,
      pageNumber: null,
      text: raw.summary,
      language: targetLanguage,
      order: -1,
    });
    narrationSegments.forEach((segment, order) => {
      segment.order = order;
    });
  }

  return {
    highlights,
    summary: {
      summary: raw.summary ?? null,
      topDeadlines: raw.topDeadlines ?? [],
      topRequiredActions: raw.topRequiredActions ?? [],
      criticalRisks: raw.criticalRisks ?? [],
    },
    narration: {
      language: targetLanguage,
      segments: narrationSegments,
    },
  };
}
