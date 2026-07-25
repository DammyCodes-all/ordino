import type {
  AgentTurnInput,
  DocumentPlan,
  DocumentPort,
  DocumentState,
} from "@/contracts";

export interface RebuiltTurnContext {
  systemPrompt: string;
  userPrompt: string;
  activeImages: Array<{
    mimeType: "image/png" | "image/jpeg" | "image/webp";
    dataUrl: string;
  }>;
}

export function buildTurnContext(
  input: AgentTurnInput,
  documentPort: DocumentPort,
): RebuiltTurnContext {
  const outline = documentPort.outline(input.document);

  const systemPrompt = `You are Ordino, an expert AI document writer and editor.
Language: English-only.
Rule: Do NOT invent node IDs. Every new node added must let the application generate the ID.

[Document Metadata]
Title: ${input.document.meta.title}
Document Type: ${input.document.meta.documentType}
Audience: ${input.document.meta.audience}
Writing Style: ${input.document.meta.writingStyle}
Instructions: ${input.document.meta.instructions ?? "None"}
Page Limit: ${input.document.meta.pageLimit ?? "None"}

[Document State]
Document ID: ${input.document.documentId}
Version: ${input.document.version}
Review Revision: ${input.document.reviewRevision}

[Current Outline]
${JSON.stringify(outline, null, 2)}

[Tool Instructions]
You have access to 6 tools: addNode, editNode, moveNode, deleteNode, readNode, finalize.
Call readNode if you need the full content of a node.
Call finalize when you have finished all document modifications.`;

  // Build conversation history (only completed prior messages)
  const historyText = input.conversation
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.text}`)
    .join("\n\n");

  const userPrompt = historyText
    ? `[Prior Conversation]\n${historyText}\n\n[Current User Message]\n${input.userMessage}`
    : input.userMessage;

  // Determine active reference images
  // Included only when starting initial generation (empty document or 0 nodes) with active references,
  // or when the current user message explicitly asks for images/references.
  const isInitialGen = input.document.nodes.length === 0;
  const mentionsImages = /image|reference|figure|photo|picture/i.test(
    input.userMessage,
  );

  let activeImages: Array<{
    mimeType: "image/png" | "image/jpeg" | "image/webp";
    dataUrl: string;
  }> = [];

  if ((isInitialGen || mentionsImages) && input.referenceImages.length > 0) {
    activeImages = input.referenceImages.map((img) => ({
      mimeType: img.mimeType,
      dataUrl: img.dataUrl,
    }));
  }

  return {
    systemPrompt,
    userPrompt,
    activeImages,
  };
}

export function buildWriterSystemPrompt(
  document: DocumentState,
  documentPort: DocumentPort,
  plan: DocumentPlan,
): string {
  const outline = documentPort.outline(document);

  const planSections = plan.sections
    .map(
      (s, i) =>
        `  ${i + 1}. "${s.heading}" — ${s.purpose} (paragraphs: ${s.estimatedParagraphs}, table: ${s.includeTable}, list: ${s.includeList})`,
    )
    .join("\n");

  return `You are Ordino, an expert AI document writer and editor.
Language: English-only.
Rule: Do NOT invent node IDs. Every new node added must let the application generate the ID.

[Document Metadata]
Title: ${document.meta.title}
Document Type: ${document.meta.documentType}
Audience: ${document.meta.audience}
Writing Style: ${document.meta.writingStyle}
Instructions: ${document.meta.instructions ?? "None"}
Page Limit: ${document.meta.pageLimit ?? "None"}

[Document State]
Document ID: ${document.documentId}
Version: ${document.version}
Review Revision: ${document.reviewRevision}

[Current Outline]
${JSON.stringify(outline, null, 2)}

[Document Plan]
${plan.summary}
${planSections}

[Tool Instructions]
You have access to 7 tools: addNode, editNode, moveNode, deleteNode, readNode, editMeta, finalize.
Prefer editing existing content over adding new content.
Call readNode if you need the full content of a node before editing it.
Use editNode to modify existing nodes. Use addNode only for genuinely new sections.
Call finalize when you have finished all document modifications.

[Style Options]
Nodes accept optional style fields for visual control:
- heading: alignment(left/center/right), spaceBefore/After(none/xs/sm/md/lg), color(#hex), fontSize(6-72)
- paragraph: alignment(left/center/right/justify), emphasis(normal/bold/italic), spaceBefore/After, color, fontSize
- list: compact(bool), spaceBefore/After, color
- table: density(compact/comfortable), headerAlignment, striped(bool), spaceBefore/After, color
- quote: alignment(left/center), spaceBefore/After, color
- callout: variant(note/highlight/warning), spaceBefore/After, color
- divider: variant(solid/subtle), spaceBefore/After
Use styles to improve visual hierarchy and readability.`;
}
