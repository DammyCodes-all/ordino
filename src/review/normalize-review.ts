import { z } from "zod";
import {
  rawVisualReviewSchema,
  visualReviewResultSchema,
  type RawVisualReview,
  type VisualReviewResult,
  type VisualIssue,
  type RasterizedPage,
  type DocumentOutline,
  type DocumentMeta,
  type ValidationIssue,
  type AppResult,
  nodeIdSchema,
} from "@/contracts";
import type { GoogleAIClient } from "@/google-ai";
import { generateStructuredOutput, createSuccessResult } from "@/google-ai";

export async function runVisualReview(
  client: GoogleAIClient,
  pages: RasterizedPage[],
  outline: DocumentOutline,
  meta: DocumentMeta,
  validationIssues: ValidationIssue[],
  signal?: AbortSignal,
): Promise<AppResult<VisualReviewResult>> {
  const images = pages.map((p) => ({
    mimeType: p.mimeType,
    dataUrl: p.dataUrl,
  }));

  const systemPrompt = `You are a visual document review expert. Analyze the provided rendered PDF page images for formatting, overflow, typography, alignment, and structural defects.
Return ONLY valid JSON matching RawVisualReview schema.
Do NOT use direct document mutation tools.`;

  const prompt = `Review these rendered document pages.
Document Meta: ${JSON.stringify(meta)}
Document Outline: ${JSON.stringify(outline)}
Known Validation Issues: ${JSON.stringify(validationIssues)}

Output JSON schema:
{
  "pass": boolean,
  "issues": [
    {
      "type": "overflow" | "spacing" | "alignment" | "orphan_heading" | "typography" | "whitespace" | "table_layout" | "visual_hierarchy" | "other",
      "severity": "warning" | "error",
      "pageNumber": number,
      "reportedNodeId": string | null,
      "detail": "string",
      "suggestedAction": string | null,
      "confidence": number
    }
  ]
}`;

  const res = await generateStructuredOutput(
    client,
    {
      prompt,
      systemPrompt,
      images,
      signal,
    },
    rawVisualReviewSchema,
  );

  if (!res.success) {
    return res;
  }

  const normalized = normalizeVisualReview(res.data, pages.length, outline);
  return createSuccessResult(normalized);
}

export function normalizeVisualReview(
  raw: RawVisualReview,
  pageCount: number,
  outline: DocumentOutline,
): VisualReviewResult {
  const validNodeIds = new Set(outline.map((o) => o.id));

  const issues: VisualIssue[] = raw.issues
    .filter((issue) => issue.pageNumber >= 1 && issue.pageNumber <= pageCount)
    .map((issue) => {
      let resolvedNodeId = null;
      if (issue.reportedNodeId && validNodeIds.has(issue.reportedNodeId as any)) {
        resolvedNodeId = nodeIdSchema.parse(issue.reportedNodeId);
      }

      const clampedConfidence = Math.max(0, Math.min(1, issue.confidence));

      return {
        type: issue.type,
        severity: issue.severity,
        pageNumber: issue.pageNumber,
        nodeId: resolvedNodeId,
        detail: issue.detail,
        suggestedAction: issue.suggestedAction,
        confidence: clampedConfidence,
      };
    });

  return visualReviewResultSchema.parse({
    documentVersion: 1, // Will be set by caller to current document.version
    pass: raw.pass,
    issues,
  });
}
