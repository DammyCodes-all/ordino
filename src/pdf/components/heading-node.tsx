import React from "react";
import { Text } from "@react-pdf/renderer";
import type { DocumentNode } from "../../contracts/document";
import { resolveHeadingStyle } from "../professional-theme";

type HeadingData = Extract<DocumentNode, { type: "heading" }>;

export function HeadingNode({ node }: { node: HeadingData }) {
  return (
    <Text style={resolveHeadingStyle(node.level, node.style) as any}>
      {node.text}
    </Text>
  );
}
