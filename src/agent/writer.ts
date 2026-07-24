import { z } from "zod";
import type {
  DocumentState,
  DocumentPlan,
  AppResult,
} from "@/contracts";
import { newDocumentNodeSchema, nodePositionSchema, nodeIdSchema } from "@/contracts";
import { GoogleAIClient, generateStructuredOutput, type ToolDefinition, type ToolCallResult } from "@/google-ai";
import { ToolExecutor } from "./tool-executor";
import { buildRevisionPrompt, type CombinedRevisionContext } from "@/review/revision-context";

const MAX_WRITER_STEPS = 20;

const WRITER_ACTION_EXAMPLES = `Output exactly one JSON object per step (no markdown fences). Valid actions:

{"action":"addNode","node":{"type":"heading","level":1,"text":"Title"},"position":{"kind":"end"}}
{"action":"addNode","node":{"type":"paragraph","text":"Body text."},"position":{"kind":"end"}}
{"action":"addNode","node":{"type":"list","ordered":false,"items":["One","Two"]},"position":{"kind":"end"}}
{"action":"editNode","nodeId":"node_id","nodeType":"paragraph","patch":{"text":"Updated text"}}
{"action":"moveNode","nodeId":"node_id","position":{"kind":"before","nodeId":"other_id"}}
{"action":"deleteNode","nodeId":"node_id"}
{"action":"readNode","nodeId":"node_id"}
{"action":"finalize"}

Position MUST use "kind" (never "anchor"):
- {"kind":"end"}
- {"kind":"before","nodeId":"..."}
- {"kind":"after","nodeId":"..."}`;

/** Models often invent { anchor } instead of { kind }; coerce common mistakes. */
function coerceWriterActionJson(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const action = { ...(value as Record<string, unknown>) };
  const position = action.position;
  if (!position || typeof position !== "object" || Array.isArray(position)) return action;
  const pos = { ...(position as Record<string, unknown>) };
  if ("kind" in pos) return action;

  const anchor = typeof pos.anchor === "string" ? pos.anchor : null;
  const nodeId =
    (typeof pos.nodeId === "string" && pos.nodeId) ||
    (typeof pos.referenceNodeId === "string" && pos.referenceNodeId) ||
    null;

  if (anchor === "end" || anchor === "last" || anchor === "first") {
    action.position = { kind: "end" };
  } else if ((anchor === "before" || anchor === "after") && nodeId) {
    action.position = { kind: anchor, nodeId };
  }
  return action;
}

const writerActionSchemaRaw = z.discriminatedUnion("action", [
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

type WriterAction = z.infer<typeof writerActionSchemaRaw>;

const writerActionSchema = z.preprocess(
  coerceWriterActionJson,
  writerActionSchemaRaw,
) as z.ZodType<WriterAction>;

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
  readResults?: Map<string, any>,
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

  const readBlock = readResults && readResults.size > 0
    ? `\n[Read node content]\n${Array.from(readResults.entries())
        .map(([id, node]) => `  ${id}: ${JSON.stringify(node)}`)
        .join("\n")}`
    : "";

  return `${userMessage}

[Document plan]
${plan.summary}
${planSections}

[Current outline]
${outlineLines || "  (empty document)"}
${readBlock}

[Available actions]
${WRITER_ACTION_EXAMPLES}

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

function describeActionProgress(step: number, action: WriterAction, ok: boolean): string {
  const prefix = `Step ${step}/${MAX_WRITER_STEPS}`;
  if (!ok) return `${prefix}: ${action.action} failed`;
  switch (action.action) {
    case "addNode": {
      const node = action.node as { type?: string; text?: string; level?: number };
      const preview =
        typeof node.text === "string" && node.text.trim()
          ? ` “${node.text.trim().slice(0, 48)}${node.text.trim().length > 48 ? "…" : ""}”`
          : "";
      return `${prefix}: added ${node.type ?? "node"}${preview}`;
    }
    case "editNode":
      return `${prefix}: edited ${action.nodeType}`;
    case "moveNode":
      return `${prefix}: moved a node`;
    case "deleteNode":
      return `${prefix}: deleted a node`;
    case "readNode":
      return `${prefix}: read a node`;
    case "finalize":
      return `${prefix}: finalized writing`;
  }
}

export async function runWriterLoop(
  client: GoogleAIClient,
  document: DocumentState,
  plan: DocumentPlan,
  toolExecutor: ToolExecutor,
  userMessage: string,
  signal?: AbortSignal,
  onProgress?: (message: string) => void,
): Promise<AppResult<{ document: DocumentState; message: string }>> {
  let currentDoc = document;
  const history: string[] = [];
  const readResults = new Map<string, any>();
  let steps = 0;

  while (steps < MAX_WRITER_STEPS) {
    if (signal?.aborted) {
      return {
        success: false,
        error: { code: "ABORTED" as any, message: "Turn was aborted by user", retryable: false },
      };
    }
    steps++;
    onProgress?.(
      `Step ${steps}/${MAX_WRITER_STEPS}: asking model for next write action…`,
    );

    const prompt = buildWriterPrompt(currentDoc, plan, history, userMessage, readResults);

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
      onProgress?.(`Step ${steps}/${MAX_WRITER_STEPS}: model output failed validation`);
      return res;
    }

    const action = res.data as WriterAction;

    if (action.action === "finalize") {
      history.push(`  Step ${steps}: finalized`);
      onProgress?.(describeActionProgress(steps, action, true));
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
      if (action.action === "readNode" && r.result.data?.node) {
        readResults.set(action.nodeId, r.result.data.node);
      }
    }
    onProgress?.(describeActionProgress(steps, action, !!r.result.success));
    history.push(`  Step ${steps}: ${action.action} ${formatActionResult(action, r.result)}`);
  }

  onProgress?.(`Reached max ${MAX_WRITER_STEPS} write steps — continuing to render`);
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
  onProgress?: (message: string) => void,
): Promise<AppResult<{ document: DocumentState }>> {
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
    onProgress?.(
      `Revision step ${steps}/${MAX_WRITER_STEPS}: asking model for a fix…`,
    );

    const outline = currentDoc.nodes.map((n, i) => ({ id: n.id, index: i, type: n.type }));
    const context: CombinedRevisionContext = { validationIssues, visualIssues };
    let prompt = buildRevisionPrompt(context, outline);

    if (history.length > 0) {
      prompt += `\n\n[Revision history]\n${history.join("\n")}`;
    }

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
      onProgress?.(`Revision step ${steps}/${MAX_WRITER_STEPS}: model output failed`);
      return res;
    }

    const action = res.data as WriterAction;

    if (action.action === "finalize") {
      onProgress?.(describeActionProgress(steps, action, true));
      return {
        success: true,
        data: { document: currentDoc },
      };
    }

    const r = executeAction(action, currentDoc, toolExecutor);
    if (r.result.success) {
      currentDoc = r.updatedDoc;
      history.push(`  Step ${steps}: ${action.action} ${formatActionResult(action, r.result)}`);
    } else {
      history.push(`  Step ${steps}: ${action.action} FAILED — ${r.result?.error?.message || "unknown error"}`);
    }
    onProgress?.(describeActionProgress(steps, action, !!r.result.success));
  }

  return {
    success: true,
    data: { document: currentDoc },
  };
}

export default runWriterLoop;

function buildWriterTools(): ToolDefinition[] {
  return [
    {
      name: "addNode",
      description: "Add a new node at a position in the document",
      parameters: {
        type: "object",
        properties: {
          node: { type: "object", description: "The node to add (type, text, level, style, etc.)" },
          position: {
            type: "object",
            description:
              "Position with kind: {\"kind\":\"end\"} | {\"kind\":\"before\",\"nodeId\":\"...\"} | {\"kind\":\"after\",\"nodeId\":\"...\"}",
            properties: {
              kind: { type: "string", enum: ["end", "before", "after"] },
              nodeId: { type: "string" },
            },
            required: ["kind"],
          },
        },
        required: ["node", "position"],
      },
    },
    {
      name: "editNode",
      description: "Edit an existing node's content or style",
      parameters: {
        type: "object",
        properties: {
          nodeId: { type: "string", description: "The ID of the node to edit" },
          nodeType: { type: "string", description: "The node type: heading, paragraph, list, table, quote, callout, divider" },
          patch: { type: "object", description: "Fields to update (text, level, style, etc.)" },
        },
        required: ["nodeId", "nodeType"],
      },
    },
    {
      name: "moveNode",
      description: "Reorder a node to a new position",
      parameters: {
        type: "object",
        properties: {
          nodeId: { type: "string", description: "The ID of the node to move" },
          position: {
            type: "object",
            description:
              "Position with kind: {\"kind\":\"end\"} | {\"kind\":\"before\",\"nodeId\":\"...\"} | {\"kind\":\"after\",\"nodeId\":\"...\"}",
            properties: {
              kind: { type: "string", enum: ["end", "before", "after"] },
              nodeId: { type: "string" },
            },
            required: ["kind"],
          },
        },
        required: ["nodeId", "position"],
      },
    },
    {
      name: "deleteNode",
      description: "Remove a node from the document",
      parameters: {
        type: "object",
        properties: {
          nodeId: { type: "string", description: "The ID of the node to delete" },
        },
        required: ["nodeId"],
      },
    },
    {
      name: "readNode",
      description: "Read the full content of a node",
      parameters: {
        type: "object",
        properties: {
          nodeId: { type: "string", description: "The ID of the node to read" },
        },
        required: ["nodeId"],
      },
    },
    {
      name: "finalize",
      description: "Signal that the document is complete",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  ];
}

function toolCallToAction(tc: ToolCallResult): WriterAction | null {
  switch (tc.toolName) {
    case "addNode":
      return { action: "addNode", node: (tc.args as any).node, position: (tc.args as any).position } as WriterAction;
    case "editNode":
      return { action: "editNode", nodeId: (tc.args as any).nodeId, nodeType: (tc.args as any).nodeType, patch: (tc.args as any).patch } as WriterAction;
    case "moveNode":
      return { action: "moveNode", nodeId: (tc.args as any).nodeId, position: (tc.args as any).position } as WriterAction;
    case "deleteNode":
      return { action: "deleteNode", nodeId: (tc.args as any).nodeId } as WriterAction;
    case "readNode":
      return { action: "readNode", nodeId: (tc.args as any).nodeId } as WriterAction;
    case "finalize":
      return { action: "finalize" } as WriterAction;
    default:
      return null;
  }
}

export async function runWriterLoopWithTools(
  client: GoogleAIClient,
  document: DocumentState,
  plan: DocumentPlan,
  toolExecutor: ToolExecutor,
  signal?: AbortSignal,
): Promise<AppResult<{ document: DocumentState; message: string; history: string[] }>> {
  let currentDoc: DocumentState = document;
  const tools = buildWriterTools();
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

    const outline = currentDoc.nodes.map((n, i) => `  ${i}: [${n.type}] ${"text" in n ? String(n.text).slice(0, 80) : n.type}`).join("\n");
    const prompt = `Create the document content based on the plan.

[Document plan]
${plan.summary}

[Current outline]
${outline || "  (empty document)"}

Build the document section by section using the available tools.`;

    const res = await client.generateWithTools({
      prompt,
      systemPrompt: "You are a document creation assistant. Use the available tools to build the document. When done, call finalize.",
      tools,
      toolChoice: "required",
      signal,
    });

    if (!res.success) return res;

    const toolCall = res.data.toolCalls?.[0];
    if (!toolCall) {
      history.push(`  Step ${steps}: no tool call — finalizing`);
      return {
        success: true,
        data: { document: currentDoc, message: `Document written in ${steps} steps.`, history },
      };
    }

    if (toolCall.toolName === "finalize") {
      history.push(`  Step ${steps}: finalized`);
      return {
        success: true,
        data: { document: currentDoc, message: `Document written in ${steps} steps.`, history },
      };
    }

    const action = toolCallToAction(toolCall);
    if (!action) {
      history.push(`  Step ${steps}: unknown tool "${toolCall.toolName}" — finalizing`);
      return {
        success: true,
        data: { document: currentDoc, message: `Document written in ${steps} steps.`, history },
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
    data: { document: currentDoc, message: `Document written (reached max ${MAX_WRITER_STEPS} steps).`, history },
  };
}

export async function runRevisionLoopWithTools(
  client: GoogleAIClient,
  document: DocumentState,
  validationIssues: any[],
  visualIssues: any[],
  toolExecutor: ToolExecutor,
  signal?: AbortSignal,
): Promise<AppResult<{ document: DocumentState }>> {
  let currentDoc = document;
  let steps = 0;
  const tools = buildWriterTools();

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

Fix one issue at a time using the available tools. Call finalize when all issues are resolved.`;

    const res = await client.generateWithTools({
      prompt,
      systemPrompt: "You are a document revision assistant. Use the available tools to fix issues. Call finalize when done.",
      tools,
      toolChoice: "required",
      signal,
    });

    if (!res.success) return res;

    const toolCall = res.data.toolCalls?.[0];
    if (!toolCall || toolCall.toolName === "finalize") {
      return { success: true, data: { document: currentDoc } };
    }

    const action = toolCallToAction(toolCall);
    if (!action) {
      return { success: true, data: { document: currentDoc } };
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
