import { AppResult } from "../contracts/result";
import { DocumentState, DocumentCheckpoint } from "../contracts/document";
import {
  DocumentCommand,
  CommandExecution,
  MutationReceipt,
  DocumentChangeSet,
  documentCommandSchema,
  newDocumentNodeSchema,
} from "../contracts/commands";
import { DocumentOutline } from "../contracts/outline";
import { documentStateSchema } from "../contracts/document";
import { checkpointIdSchema } from "../contracts/ids";

const makeError = (code: string, message: string): AppResult<never> => ({
  success: false,
  error: { code: code as any, message, retryable: false },
});

function previewForNode(node: any): string {
  if (!node) return "";
  switch (node.type) {
    case "heading":
    case "paragraph":
    case "quote":
      return String(node.text ?? "").slice(0, 120);
    case "callout":
      return String(node.title ?? node.text ?? "").slice(0, 120);
    case "list":
      return (node.items || []).join(" ").slice(0, 120);
    case "table":
      return (node.columns || [])
        .map((c: any) => c.header)
        .join(" | ")
        .slice(0, 120);
    case "divider":
      return "—";
    case "page_break":
      return "[page break]";
    default:
      return "";
  }
}

function defaultStylesFor(type: string) {
  switch (type) {
    case "heading":
      return {
        spaceBefore: "md",
        spaceAfter: "sm",
        alignment: "left",
        keepWithNext: false,
      };
    case "paragraph":
      return {
        spaceBefore: "none",
        spaceAfter: "md",
        alignment: "left",
        emphasis: "normal",
      };
    case "list":
      return { spaceBefore: "sm", spaceAfter: "sm", compact: false };
    case "table":
      return {
        spaceBefore: "sm",
        spaceAfter: "sm",
        density: "comfortable",
        headerAlignment: "left",
        striped: false,
      };
    case "quote":
      return { spaceBefore: "sm", spaceAfter: "sm", alignment: "left" };
    case "callout":
      return { spaceBefore: "sm", spaceAfter: "sm", variant: "note" };
    case "divider":
      return { spaceBefore: "sm", spaceAfter: "sm", variant: "solid" };
    default:
      return undefined;
  }
}

function completeNewNode(node: any) {
  const base = { ...node } as any;
  if (base.type !== "page_break") {
    base.style = {
      ...(defaultStylesFor(base.type) || {}),
      ...(base.style || {}),
    };
  }
  if (base.type === "list") {
    base.items = (base.items || []).map((i: any) => String(i || "").trim());
  }
  if (base.type === "table") {
    base.columns = (base.columns || []).map((c: any) => ({
      header: String(c.header || "").trim(),
      widthPercent: c.widthPercent ?? null,
    }));
    base.rows = (base.rows || []).map((r: any) =>
      (r || []).map((c: any) => String(c || "").trim()),
    );
  }
  if (base.type === "heading") base.text = String(base.text || "").trim();
  if (base.type === "paragraph") base.text = String(base.text || "").trim();
  if (base.type === "quote") base.text = String(base.text || "").trim();
  if (base.type === "callout") base.text = String(base.text || "").trim();
  return base;
}

export function createOutline(document: DocumentState): DocumentOutline {
  return document.nodes.map((node, idx) => ({
    id: node.id,
    index: idx,
    type: node.type,
    preview: previewForNode(node),
  }));
}

export function executeCommand(
  document: DocumentState,
  command: DocumentCommand,
): AppResult<CommandExecution> {
  // Validate command shape early using shared schemas
  const cmdParsed = documentCommandSchema.safeParse(command as any);
  if (!cmdParsed.success) {
    return makeError("INVALID_NODE", "Command failed validation");
  }
  // Immutable: clone document
  const doc = structuredClone(document) as DocumentState;

  const fromVersion = doc.version;

  const addedNodeIds: string[] = [];
  const updatedNodeIds: string[] = [];
  const movedNodeIds: string[] = [];
  const deletedNodeIds: string[] = [];
  let affectsPagination = false;

  if (command.type === "add_node") {
    // Validate the incoming node shape (and table constraints) before creating id
    const nodeValidate = newDocumentNodeSchema.safeParse(command.node as any);
    if (!nodeValidate.success)
      return makeError("INVALID_NODE", "Node failed validation");

    const nodeId = crypto.randomUUID();
    const completed = completeNewNode(command.node as any);
    const newNode = { ...completed, id: nodeId } as any;
    // resolve position
    const pos = command.position;
    if (pos.kind === "end") {
      doc.nodes.push(newNode);
    } else {
      const idx = doc.nodes.findIndex((n) => n.id === pos.nodeId);
      if (idx === -1)
        return makeError("NODE_NOT_FOUND", "Target node not found");
      const insertAt = pos.kind === "before" ? idx : idx + 1;
      doc.nodes.splice(insertAt, 0, newNode);
    }
    addedNodeIds.push(nodeId);
    affectsPagination = true;
  } else if (command.type === "delete_node") {
    const idx = doc.nodes.findIndex((n) => n.id === command.nodeId);
    if (idx === -1)
      return makeError("NODE_NOT_FOUND", "Node to delete not found");
    doc.nodes.splice(idx, 1);
    deletedNodeIds.push(command.nodeId);
    affectsPagination = true;
  } else if (command.type === "move_node") {
    const idx = doc.nodes.findIndex((n) => n.id === command.nodeId);
    if (idx === -1)
      return makeError("NODE_NOT_FOUND", "Node to move not found");
    const pos = command.position;
    if (pos.kind === "before" && pos.nodeId === command.nodeId)
      return makeError("INVALID_POSITION", "Cannot move node before itself");
    if (pos.kind === "after" && pos.nodeId === command.nodeId)
      return makeError("INVALID_POSITION", "Cannot move node after itself");

    const [node] = doc.nodes.splice(idx, 1);
    let targetIdx = -1;
    if (pos.kind === "end") {
      doc.nodes.push(node);
    } else {
      targetIdx = doc.nodes.findIndex((n) => n.id === pos.nodeId);
      if (targetIdx === -1)
        return makeError("NODE_NOT_FOUND", "Target node not found");
      const insertAt = pos.kind === "before" ? targetIdx : targetIdx + 1;
      doc.nodes.splice(insertAt, 0, node);
    }
    movedNodeIds.push(command.nodeId);
    affectsPagination = true;
  } else if (command.type === "edit_node") {
    const idx = doc.nodes.findIndex((n) => n.id === command.nodeId);
    if (idx === -1)
      return makeError("NODE_NOT_FOUND", "Node to edit not found");
    const existing = doc.nodes[idx] as any;
    if (existing.type !== command.nodeType)
      return makeError("NODE_TYPE_MISMATCH", "Node type mismatch");
    if (!command.patch || Object.keys(command.patch as any).length === 0)
      return makeError(
        "EMPTY_PATCH",
        "An edit patch must contain at least one field.",
      );

    const { style: patchStyle, ...restPatches } = command.patch as any;
    Object.assign(existing, restPatches);
    if (patchStyle) {
      existing.style = { ...existing.style, ...patchStyle };
    }
    updatedNodeIds.push(command.nodeId);
    const contentFields = [
      "text",
      "level",
      "items",
      "columns",
      "rows",
      "ordered",
      "title",
    ];
    if (contentFields.some((f) => f in (command.patch as any))) {
      affectsPagination = true;
    }
  } else {
    return makeError("INVALID_NODE", "Unsupported command type");
  }

  // validate the resulting document before committing the version bump
  const parsed = documentStateSchema.safeParse(doc);
  if (!parsed.success)
    return makeError("INVALID_NODE", "Resulting document invalid");

  // bump version only after validation succeeds
  const toVersion = doc.version + 1;
  doc.version = toVersion;

  const changeSet: DocumentChangeSet = {
    fromVersion,
    toVersion,
    addedNodeIds,
    updatedNodeIds,
    movedNodeIds,
    deletedNodeIds,
    affectsPagination,
  } as any;

  const outline = createOutline(doc);

  const baseReceipt = {
    documentVersion: toVersion,
    outline,
    changeSet,
  };

  const receipt =
    command.type === "add_node"
      ? { ...baseReceipt, nodeId: addedNodeIds[0] }
      : baseReceipt;

  const execution: CommandExecution = { document: doc, receipt } as any;

  return { success: true, data: execution };
}

export function createCheckpoint(
  document: DocumentState,
  reason: "user_turn" | "review_revision",
): AppResult<{ checkpoint: DocumentCheckpoint; document: DocumentState }> {
  const checkpoint: DocumentCheckpoint = {
    id: checkpointIdSchema.parse(crypto.randomUUID()),
    reason,
    document: structuredClone(document),
    createdAt: new Date().toISOString(),
  };

  const continuation = structuredClone(document) as DocumentState;
  if (reason === "review_revision")
    continuation.reviewRevision = continuation.reviewRevision + 1;

  return { success: true, data: { checkpoint, document: continuation } };
}

export function restoreCheckpoint(
  checkpoint: DocumentCheckpoint,
): DocumentState {
  return structuredClone(checkpoint.document);
}

export default executeCommand;
