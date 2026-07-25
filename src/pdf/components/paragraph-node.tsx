import { Text, View } from "@react-pdf/renderer";
import type { DocumentNode } from "../../contracts/document";
import { resolveParagraphStyle } from "../professional-theme";

type ViewStyle = React.ComponentProps<typeof View>["style"];
type ParagraphData = Extract<DocumentNode, { type: "paragraph" }>;

export function ParagraphNode({ node }: { node: ParagraphData }) {
  return (
    <Text style={resolveParagraphStyle(node.style) as ViewStyle}>
      {node.text}
    </Text>
  );
}
