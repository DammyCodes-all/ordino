import { z } from "zod";
import type {
  DocumentState,
  DocumentPlan,
  AppResult,
} from "@/contracts";
import { newDocumentNodeSchema, nodePositionSchema, nodeIdSchema } from "@/contracts";
import { GoogleAIClient, generateStructuredOutput } from "@/google-ai";
import { ToolExecutor } from "./tool-executor";

const MAX_WRITER_STEPS = 20;

const writerActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("addNode"),
    node: newDocumentNodeSchema,
    position: nodePositionSchema,
  }).strict(),
  z.object({
    action: z.literal("editNode"),
    nodeId: nodeIdSchema,
    nodeType: z.enum(["heading", "paragraph", "list", "table", "quote", "callout", "divider"]),
    patch: z.record(z.string(), z.unknown()),
  }).strict(),
  z.object({
    action: z.literal("moveNode"),
    nodeId: nodeIdSchema,
    position: nodePositionSchema,
  }).strict(),
  z.object({
    action: z.literal("deleteNode"),
    nodeId: nodeIdSchema,
  }).strict(),
  z.object({
    action: z.literal("readNode"),
    nodeId: nodeIdSchema,
  }).strict(),
  z.object({
    action: z.literal("finalize"),
  }).strict(),
]);

type WriterAction = z.infer<typeof writerActionSchema>;

function executeAction(
  action: WriterAction,
  currentDoc: DocumentState,
  toolExecutor: ToolExecutor,
): { result: any; updatedDoc: DocumentState } {
  switch (action.action) {
    case "addNode":
      return toolExecutor.addNode(currentDoc, { node: action.node, position: action.position });
    case "editNode":
      return toolExecutor.editNode(currentDoc, { type: "edit_node", nodeId: action.nodeId, nodeType: action.nodeType, patch: action.patch } as any);
    case "moveNode":
      return toolExecutor.moveNode(currentDoc, { nodeId: action.nodeId, position: action.position });
    case "deleteNode":
      return toolExecutor.deleteNode(currentDoc, { nodeId: action.nodeId });
    case "readNode":
      return toolExecutor.readNode(currentDoc, { nodeId: action.nodeId });
    case "finalize":
      return { result: { success: true, data: {} }, updatedDoc: currentDoc };
  }
}

function buildWriterPrompt(
  document: DocumentState,
  plan: DocumentPlan,
  history: string[],
  userMessage: string,
): string {
  const outlineLines = document.nodes.map((n, i) =>
    `  ${i}: [${n.type}] ${"text" in n ? String(n.text).slice(0, 80) : n.type}`
  ).join("\n");

  const planSections = plan.sections.map((s, i) =>
    `  ${i + 1}. "${s.heading}" — ${s.purpose} (paragraphs: ${s.estimatedParagraphs}, table: ${s.includeTable}, list: ${s.includeList})`
  ).join("\n");

  const historyBlock = history.length > 0
    ? `\n[Tool call history]\n${history.join("\n")}`
    : "";

  return `${userMessage}

[Document plan]
${plan.summary}
${planSections}

[Current outline]
${outlineLines || "  (empty document)"}

[Available actions]
Output one action at a time as JSON matching the schema below.
- addNode: Add a new node at a position
- editNode: Edit an existing node's content or style
- moveNode: Reorder a node
- deleteNode: Remove a node
- readNode: Read the full content of a node
- finalize: Signal that writing is complete

Write the document section by section based on the plan.${historyBlock}`;
}

function formatActionResult(action: WriterAction, result: any): string {
  if (!result || !result.success) {
    return `FAILED — ${result?.error?.message || "unknown error"}`;
  }
  const data = result.data;
  if (action.action === "addNode" && data?.nodeId) {
    return `→ created nodeId: "${data.nodeId}"`;
  }
  if (action.action === "deleteNode") {
    return `→ removed nodeId: "${action.nodeId}"`;
  }
  if (action.action === "editNode") {
    const changedFields = action.patch ? Object.keys(action.patch).join(", ") : "";
    return `→ edited nodeId: "${action.nodeId}" (${changedFields || "style"})`;
  }
  if (action.action === "moveNode") {
    return `→ moved nodeId: "${action.nodeId}"`;
  }
  return "succeeded";
}

export async function runWriterLoop(
  client: GoogleAIClient,
  document: DocumentState,
  plan: DocumentPlan,
  toolExecutor: ToolExecutor,
  userMessage: string,
  signal?: AbortSignal,
): Promise<AppResult<{ document: DocumentState; message: string }>> {
  let currentDoc = document;
  const history: string[] = [];
  let steps = 0;

  while (steps < MAX_WRITER_STEPS) {
    if (signal?.aborted) {
      return {
        success: false,
        error: { code: "ABORTED" as any, message: "Turn was aborted by user", retryable: false },
      };
    }
    steps++;

    const prompt = buildWriterPrompt(currentDoc, plan, history, userMessage);

    const res = await generateStructuredOutput(
      client,
      {
        prompt,
        systemPrompt: "You are Ordino, an AI document writer. Output one action as JSON matching the provided schema. Build the document section by section according to the plan.",
        signal,
      },
      writerActionSchema,
    );

    if (!res.success) {
      return res;
    }

    const action = res.data as WriterAction;

    if (action.action === "finalize") {
      history.push(`  Step ${steps}: finalized`);
      return {
        success: true,
        data: {
          document: currentDoc,
          message: `Document written in ${steps} steps.`,
        },
      };
    }

    const r = executeAction(action, currentDoc, toolExecutor);
    if (r.result.success) {
      currentDoc = r.updatedDoc;
    }
    history.push(`  Step ${steps}: ${action.action} ${formatActionResult(action, r.result)}`);
  }

  return {
    success: true,
    data: {
      document: currentDoc,
      message: `Document written (reached max ${MAX_WRITER_STEPS} steps).`,
    },
  };
}

export async function runRevisionLoop(
  client: GoogleAIClient,
  document: DocumentState,
  validationIssues: any[],
  visualIssues: any[],
  toolExecutor: ToolExecutor,
  signal?: AbortSignal,
): Promise<AppResult<{ document: DocumentState }>> {
  let currentDoc = document;
  let steps = 0;

  while (steps < MAX_WRITER_STEPS) {
    if (signal?.aborted) {
      return {
        success: false,
        error: { code: "ABORTED" as any, message: "Turn was aborted by user", retryable: false },
      };
    }
    steps++;

    const outline = currentDoc.nodes.map((n, i) => ({ id: n.id, index: i, type: n.type }));
    const prompt = `You are revising a document based on review feedback.

Current outline: ${JSON.stringify(outline)}

Validation issues: ${JSON.stringify(validationIssues)}
Visual review issues: ${JSON.stringify(visualIssues)}

Fix one issue at a time using the available actions. Output finalize when all issues are resolved or cannot be fixed.`;

    const res = await generateStructuredOutput(
      client,
      {
        prompt,
        systemPrompt: "You are a document revision assistant. Output one action per step. Call finalize when done.",
        signal,
      },
      writerActionSchema,
    );

    if (!res.success) {
      return res;
    }

    const action = res.data as WriterAction;

    if (action.action === "finalize") {
      return {
        success: true,
        data: { document: currentDoc },
      };
    }

    const r = executeAction(action, currentDoc, toolExecutor);
    if (r.result.success) {
      currentDoc = r.updatedDoc;
    }
  }

  return {
    success: true,
    data: { document: currentDoc },
  };
}

export default runWriterLoop;
