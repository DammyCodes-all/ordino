import { Text, View } from "@react-pdf/renderer";
import type { DocumentNode } from "../../contracts/document";
import { resolveHeadingStyle } from "../professional-theme";

type ViewStyle = React.ComponentProps<typeof View>["style"];
type HeadingData = Extract<DocumentNode, { type: "heading" }>;

export function HeadingNode({ node }: { node: HeadingData }) {
  return (
    <Text style={resolveHeadingStyle(node.level, node.style) as ViewStyle}>
      {node.text}
    </Text>
  );
}
