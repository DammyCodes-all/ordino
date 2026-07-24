import {
  type DocumentCheckpoint,
  type DocumentNode,
  type DocumentState,
  type OutlineItem,
  checkpointIdSchema,
  documentIdSchema,
  documentStateSchema,
  messageIdSchema,
  nodeIdSchema,
  referenceImageIdSchema,
} from "@/contracts";

export function createId(
  kind: "document" | "node" | "message" | "reference" | "checkpoint",
) {
  const raw = crypto.randomUUID();
  switch (kind) {
    case "document":
      return documentIdSchema.parse(raw);
    case "node":
      return nodeIdSchema.parse(raw);
    case "message":
      return messageIdSchema.parse(raw);
    case "reference":
      return referenceImageIdSchema.parse(raw);
    case "checkpoint":
      return checkpointIdSchema.parse(raw);
  }
}

export function createEmptyDocument(title = "Untitled document"): DocumentState {
  return documentStateSchema.parse({
    schemaVersion: 1,
    documentId: createId("document"),
    version: 0,
    reviewRevision: 0,
    meta: {
      title,
      documentType: "Document",
      audience: "General",
      writingStyle: "professional",
      instructions: null,
      pageLimit: null,
    },
    nodes: [],
  });
}

const defaultSpacing = {
  spaceBefore: "none" as const,
  spaceAfter: "md" as const,
};

export function createMockDocumentFromPrompt(prompt: string): DocumentState {
  const title =
    prompt.trim().slice(0, 80).replace(/\s+/g, " ") || "Untitled document";
  const headingId = createId("node");
  const paragraphId = createId("node");
  const listId = createId("node");

  const nodes: DocumentNode[] = [
    {
      id: headingId,
      type: "heading",
      level: 1,
      text: title,
      style: {
        ...defaultSpacing,
        spaceBefore: "md",
        alignment: "left",
        keepWithNext: true,
      },
    },
    {
      id: paragraphId,
      type: "paragraph",
      text: `Draft generated from your request: “${prompt.trim().slice(0, 280)}”. This preview is a mock until the document and agent modules are connected.`,
      style: {
        ...defaultSpacing,
        alignment: "left",
        emphasis: "normal",
      },
    },
    {
      id: listId,
      type: "list",
      ordered: true,
      items: [
        "Plan structure and audience",
        "Draft sections in chat",
        "Review layout visually",
        "Export the final PDF",
      ],
      style: { ...defaultSpacing, compact: false },
    },
  ];

  return documentStateSchema.parse({
    schemaVersion: 1,
    documentId: createId("document"),
    version: 1,
    reviewRevision: 0,
    meta: {
      title,
      documentType: "Generated Document",
      audience: "General",
      writingStyle: "professional",
      instructions: null,
      pageLimit: null,
    },
    nodes,
  });
}

export function createCheckpoint(
  document: DocumentState,
  reason: DocumentCheckpoint["reason"] = "user_turn",
): DocumentCheckpoint {
  return {
    id: createId("checkpoint"),
    reason,
    document,
    createdAt: new Date().toISOString(),
  };
}

export function deriveOutline(document: DocumentState): OutlineItem[] {
  return document.nodes.map((node, index) => {
    let preview = "";
    switch (node.type) {
      case "heading":
      case "paragraph":
      case "quote":
        preview = node.text;
        break;
      case "callout":
        preview = node.title ? `${node.title}: ${node.text}` : node.text;
        break;
      case "list":
        preview = node.items[0] ?? "List";
        break;
      case "table":
        preview = node.columns.map((c) => c.header).join(" · ");
        break;
      case "divider":
        preview = "Divider";
        break;
      case "page_break":
        preview = "Page break";
        break;
    }
    return {
      id: node.id,
      index,
      type: node.type,
      preview: preview.slice(0, 120),
    };
  });
}
