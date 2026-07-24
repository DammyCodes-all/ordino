import { Text } from "@react-pdf/renderer";
import type { DocumentNode } from "../../contracts/document";
import { resolveParagraphStyle } from "../professional-theme";

type ParagraphData = Extract<DocumentNode, { type: "paragraph" }>;

export function ParagraphNode({ node }: { node: ParagraphData }) {
  return (
    <Text style={resolveParagraphStyle(node.style) as any}>{node.text}</Text>
  );
}
