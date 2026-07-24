import type { PdfAnalysisRequest } from "@/contracts";

export function buildPdfAnalysisSystemPrompt(): string {
  return `You analyze PDF page images together with extracted text.
Identify meaningful highlights such as deadlines, money, signatures, obligations, risks, rights, termination terms, and required actions.
Explain each highlight in plain language, then translate that explanation into the requested language.
Produce narration-ready wording for text-to-speech.
When span IDs are provided, include candidateSpanIds for the spans that contain the source excerpt.
When generatedDocumentContext is present, you may include candidateNodeIds from that digest, but the rendered page and extracted text remain the source of truth.
Do not give legal or financial advice. Mark uncertainty when the source is ambiguous.
Return JSON only.`;
}

export function buildPdfAnalysisUserPrompt(
  request: PdfAnalysisRequest,
): string {
  const pages = request.pages
    .map((page) => {
      const spans = page.textSpanDigest
        .slice(0, 120)
        .map((span) => `- ${span.id}: ${JSON.stringify(span.text)}`)
        .join("\n");
      return `Page ${page.pageNumber}
Raw text:
${page.rawText.slice(0, 6_000)}

Span digest:
${spans || "(none)"}`;
    })
    .join("\n\n");

  const generated = request.generatedDocumentContext
    ? `Generated document context (structural hint only):
Title: ${request.generatedDocumentContext.title}
Type: ${request.generatedDocumentContext.documentType}
Audience: ${request.generatedDocumentContext.audience}
Outline: ${request.generatedDocumentContext.outline
        .slice(0, 40)
        .map((item) => `${item.type}:${item.preview}`)
        .join(" | ")}
Node digest: ${request.generatedDocumentContext.nodeTextDigest
        .slice(0, 40)
        .map((node) => `${node.nodeId}:${node.type}:${node.text.slice(0, 120)}`)
        .join(" || ")}`
    : "Generated document context: none (uploaded PDF).";

  return `Analyze the attached PDF page image(s).

Analysis document ID: ${request.analysisDocumentId}
Origin: ${request.origin}
Target language: ${request.targetLanguage}
User goal: ${request.userGoal ?? "Identify important clauses and required actions."}

${generated}

${pages}

Respond with JSON matching:
{
  "highlights": [
    {
      "pageNumber": 1,
      "kind": "deadline|money|signature|obligation|risk|right|termination|required_action|other",
      "severity": "info|important|critical",
      "sourceText": "exact excerpt",
      "candidateSpanIds": ["uuid"],
      "candidateNodeIds": ["uuid"],
      "plainLanguageText": "simple explanation",
      "translatedText": "explanation in ${request.targetLanguage}",
      "narrationText": "spoken wording",
      "reason": "why this matters",
      "confidence": 0.0
    }
  ],
  "summary": "short overall summary in ${request.targetLanguage}",
  "topDeadlines": [],
  "topRequiredActions": [],
  "criticalRisks": []
}`;
}
