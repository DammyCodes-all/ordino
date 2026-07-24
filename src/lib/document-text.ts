import type { DocumentNode, DocumentState } from "@/contracts";

function nodeToText(node: DocumentNode): string {
  switch (node.type) {
    case "heading":
    case "paragraph":
    case "quote":
      return node.text;
    case "callout":
      return [node.title, node.text].filter(Boolean).join(". ");
    case "list":
      return node.items
        .map((item, index) =>
          node.ordered ? `${index + 1}. ${item}` : `• ${item}`,
        )
        .join("\n");
    case "table": {
      const header = node.columns.map((column) => column.header).join(" | ");
      const rows = node.rows.map((row) => row.join(" | ")).join("\n");
      return [header, rows].filter(Boolean).join("\n");
    }
    case "divider":
      return "";
    case "page_break":
      return "\n";
    default:
      return "";
  }
}

/** Flatten document nodes into spoken/script text for Gemma voice mode. */
export function documentToSpokenText(document: DocumentState): string {
  const parts = [
    document.meta.title,
    document.meta.documentType
      ? `Document type: ${document.meta.documentType}`
      : "",
    ...document.nodes.map(nodeToText),
  ].filter((part) => part.trim().length > 0);

  return parts.join("\n\n").trim();
}
