import type {
  AppResult,
  DocumentCheckpoint,
  DocumentPort,
  DocumentState,
  ValidationIssue,
  VisualIssue,
} from "@/contracts";
import type { GoogleAIClient } from "@/google-ai";
import { ToolExecutor } from "../agent/tool-executor";

export interface CombinedRevisionContext {
  validationIssues: ValidationIssue[];
  visualIssues: VisualIssue[];
}

export async function prepareReviewCheckpoint(
  document: DocumentState,
  documentPort: DocumentPort,
): Promise<{
  checkpoint: DocumentCheckpoint;
  nextDocument: DocumentState;
} | null> {
  const res = documentPort.createCheckpoint(document, "review_revision");
  if (res.success) {
    return {
      checkpoint: res.data.checkpoint,
      nextDocument: res.data.document,
    };
  }
  return null;
}

export function buildRevisionPrompt(
  context: CombinedRevisionContext,
  document: DocumentState,
  readResults?: Map<string, any>,
): string {
  const outlineLines = document.nodes
    .map(
      (n, i) =>
        `  ${i}: [${n.type}] ${"text" in n ? String(n.text).slice(0, 80) : n.type}`,
    )
    .join("\n");

  const readBlock =
    readResults && readResults.size > 0
      ? `\n[Read node content]\n${Array.from(readResults.entries())
          .map(([id, node]) => `  ${id}: ${JSON.stringify(node)}`)
          .join("\n")}`
      : "";

  return `You are revising a document based on visual and deterministic validation review feedback.

[Document Metadata]
Title: ${document.meta.title}
Document Type: ${document.meta.documentType}
Audience: ${document.meta.audience}
Writing Style: ${document.meta.writingStyle}

[Current Outline]
${outlineLines || "  (empty document)"}
${readBlock}

[Validation Issues]
${JSON.stringify(context.validationIssues, null, 2)}

[Visual Review Issues]
${JSON.stringify(context.visualIssues, null, 2)}

Instructions:
1. Fix each reported issue with one JSON action per step.
2. Use editNode to modify existing nodes. Use readNode first to inspect full content.
3. Use addNode only for missing content. Use deleteNode to remove problematic content.
4. Style fixes are valid: edit alignment, emphasis, spacing, callout variant, table striping.
5. Output {"action":"finalize"} when finished.

Available actions (position MUST use "kind", never "anchor"):
{"action":"editNode","nodeId":"node_id","nodeType":"paragraph","patch":{"text":"Fixed text"}}
{"action":"addNode","node":{"type":"paragraph","text":"New text."},"position":{"kind":"end"}}
{"action":"moveNode","nodeId":"node_id","position":{"kind":"after","nodeId":"other_id"}}
{"action":"deleteNode","nodeId":"node_id"}
{"action":"readNode","nodeId":"node_id"}
{"action":"editMeta","patch":{"title":"Better Title"}}
{"action":"finalize"}`;
}
