import React from "react";
import { View } from "@react-pdf/renderer";
import type { DocumentNode } from "../../contracts/document";
import { resolveDividerStyle, THEME } from "../professional-theme";

type DividerData = Extract<DocumentNode, { type: "divider" }>;

export function DividerNode({ node }: { node: DividerData }) {
  const resolved = resolveDividerStyle(node.style);
  return (
    <View
      style={{
        marginTop: resolved.marginTop as number,
        marginBottom: resolved.marginBottom as number,
        height: THEME.DIVIDER.height,
        backgroundColor:
          node.style.variant === "subtle"
            ? THEME.DIVIDER.subtleColor
            : THEME.DIVIDER.color,
      }}
    />
  );
}
