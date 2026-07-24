import React from "react";
import { View, Text } from "@react-pdf/renderer";
import type { DocumentNode } from "../../contracts/document";
import { resolveListNodeStyle, THEME } from "../professional-theme";

type ListData = Extract<DocumentNode, { type: "list" }>;

export function ListNode({ node }: { node: ListData }) {
  const containerStyle = resolveListNodeStyle(node.style);
  return (
    <View style={containerStyle as any}>
      {node.items.map((item: string, idx: number) => (
        <View
          key={`${node.id}-item-${idx}`}
          style={{
            flexDirection: "row",
            marginBottom: node.style.compact ? 2 : 4,
          }}
        >
          <Text
            style={{
              width: 20,
              fontSize: THEME.FONT_SIZES.body,
              color: THEME.COLORS.muted,
            }}
          >
            {node.ordered ? `${idx + 1}.` : "\u2022"}
          </Text>
          <Text style={{ flex: 1, fontSize: THEME.FONT_SIZES.body }}>
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}
