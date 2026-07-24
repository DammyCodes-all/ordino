import type {
  ValidationIssue,
  VisualIssue,
  DocumentState,
  DocumentCheckpoint,
  DocumentPort,
  AppResult,
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
): Promise<{ checkpoint: DocumentCheckpoint; nextDocument: DocumentState } | null> {
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
  outline: any[],
): string {
  return `You are revising a document based on visual and deterministic validation review feedback.
Current Outline: ${JSON.stringify(outline, null, 2)}

Validation Issues:
${JSON.stringify(context.validationIssues, null, 2)}

Visual Review Issues:
${JSON.stringify(context.visualIssues, null, 2)}

Instructions:
1. Fix each reported issue using document tools (editNode, moveNode, deleteNode, addNode).
2. Call readNode before making content-sensitive edits if outline preview is insufficient.
3. Call finalizeDocument when finished.`;
}
