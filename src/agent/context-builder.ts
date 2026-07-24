import type {
  DocumentState,
  DocumentPort,
  ConversationMessage,
  ReferenceImage,
  AgentTurnInput,
} from "@/contracts";

export interface RebuiltTurnContext {
  systemPrompt: string;
  userPrompt: string;
  activeImages: Array<{ mimeType: "image/png" | "image/jpeg" | "image/webp"; dataUrl: string }>;
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
You have access to 6 tools: addNode, editNode, moveNode, deleteNode, readNode, finalizeDocument.
Call readNode if you need the full content of a node.
Call finalizeDocument when you have finished all document modifications.`;

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
  const mentionsImages = /image|reference|figure|photo|picture/i.test(input.userMessage);

  let activeImages: Array<{ mimeType: "image/png" | "image/jpeg" | "image/webp"; dataUrl: string }> = [];

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
