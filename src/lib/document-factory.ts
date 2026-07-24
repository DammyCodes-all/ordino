import {
  type AnalysisDocumentId,
  analysisDocumentIdSchema,
  type CheckpointId,
  checkpointIdSchema,
  type DocumentCheckpoint,
  type DocumentId,
  type DocumentNode,
  type DocumentState,
  documentIdSchema,
  documentStateSchema,
  type HighlightId,
  highlightIdSchema,
  type MessageId,
  messageIdSchema,
  type NarrationSegmentId,
  type NodeId,
  narrationSegmentIdSchema,
  nodeIdSchema,
  type OutlineItem,
  type PdfTextSpanId,
  pdfTextSpanIdSchema,
  type ReferenceImageId,
  referenceImageIdSchema,
} from "@/contracts";

export function createId(kind: "document"): DocumentId;
export function createId(kind: "node"): NodeId;
export function createId(kind: "message"): MessageId;
export function createId(kind: "reference"): ReferenceImageId;
export function createId(kind: "checkpoint"): CheckpointId;
export function createId(kind: "analysis"): AnalysisDocumentId;
export function createId(kind: "span"): PdfTextSpanId;
export function createId(kind: "highlight"): HighlightId;
export function createId(kind: "narration"): NarrationSegmentId;
export function createId(
  kind:
    | "document"
    | "node"
    | "message"
    | "reference"
    | "checkpoint"
    | "analysis"
    | "span"
    | "highlight"
    | "narration",
):
  | DocumentId
  | NodeId
  | MessageId
  | ReferenceImageId
  | CheckpointId
  | AnalysisDocumentId
  | PdfTextSpanId
  | HighlightId
  | NarrationSegmentId {
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
    case "analysis":
      return analysisDocumentIdSchema.parse(raw);
    case "span":
      return pdfTextSpanIdSchema.parse(raw);
    case "highlight":
      return highlightIdSchema.parse(raw);
    case "narration":
      return narrationSegmentIdSchema.parse(raw);
  }
}

export function createEmptyDocument(
  title = "Untitled document",
): DocumentState {
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

  const nodes: DocumentNode[] = [
    {
      id: createId("node"),
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
      id: createId("node"),
      type: "paragraph",
      text: `This is a fake Ordino PDF generated from your request: “${prompt.trim().slice(0, 220)}”. Use it to judge layout, sidebar scale, and export feel before the real renderer lands.`,
      style: {
        ...defaultSpacing,
        alignment: "left",
        emphasis: "normal",
      },
    },
    {
      id: createId("node"),
      type: "heading",
      level: 2,
      text: "Executive summary",
      style: {
        ...defaultSpacing,
        spaceBefore: "md",
        alignment: "left",
        keepWithNext: true,
      },
    },
    {
      id: createId("node"),
      type: "paragraph",
      text: "Ordino drafts professional documents through chat, keeps intermediate renders private, and publishes a final PDF preview only when the agent turn completes. Reference images stay as AI context and are not placed into the PDF in v1.",
      style: {
        ...defaultSpacing,
        alignment: "left",
        emphasis: "normal",
      },
    },
    {
      id: createId("node"),
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
    {
      id: createId("node"),
      type: "callout",
      title: "Note",
      text: "This preview is a stand-in PDF so you can evaluate the Claude-style artifact sidebar. Teammate A will replace it with the production renderer.",
      style: {
        ...defaultSpacing,
        variant: "note",
      },
    },
    {
      id: createId("node"),
      type: "heading",
      level: 2,
      text: "Sample schedule",
      style: {
        ...defaultSpacing,
        spaceBefore: "md",
        alignment: "left",
        keepWithNext: true,
      },
    },
    {
      id: createId("node"),
      type: "table",
      columns: [
        { header: "Phase", widthPercent: 34 },
        { header: "Owner", widthPercent: 33 },
        { header: "Status", widthPercent: 33 },
      ],
      rows: [
        ["Discovery", "You", "Complete"],
        ["Drafting", "Ordino", "In progress"],
        ["Visual review", "Vision loop", "Queued"],
      ],
      style: {
        ...defaultSpacing,
        density: "comfortable",
        headerAlignment: "left",
        striped: true,
      },
    },
    {
      id: createId("node"),
      type: "page_break",
    },
    {
      id: createId("node"),
      type: "heading",
      level: 2,
      text: "Appendix",
      style: {
        ...defaultSpacing,
        spaceBefore: "md",
        alignment: "left",
        keepWithNext: true,
      },
    },
    {
      id: createId("node"),
      type: "quote",
      text: "Editing is chat-only. There is no direct block or WYSIWYG editor in v1.",
      attribution: "Ordino collaboration contract",
      style: {
        ...defaultSpacing,
        alignment: "left",
      },
    },
    {
      id: createId("node"),
      type: "paragraph",
      text: "Continue prompting in chat to revise. The previous published preview stays visible while a follow-up turn runs, matching the final-only publication rule.",
      style: {
        ...defaultSpacing,
        alignment: "left",
        emphasis: "normal",
      },
    },
    {
      id: createId("node"),
      type: "divider",
      style: {
        ...defaultSpacing,
        variant: "subtle",
      },
    },
    {
      id: createId("node"),
      type: "paragraph",
      text: "End of fake preview document.",
      style: {
        ...defaultSpacing,
        alignment: "left",
        emphasis: "italic",
      },
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
