import { Text, View } from "@react-pdf/renderer";
import type { DocumentNode } from "../../contracts/document";
import { resolveListNodeStyle, THEME } from "../professional-theme";

type ViewStyle = React.ComponentProps<typeof View>["style"];
type ListData = Extract<DocumentNode, { type: "list" }>;

export function ListNode({ node }: { node: ListData }) {
  const { color, fontFamily: _, ...containerStyle } = resolveListNodeStyle(
    node.style,
  ) as Record<string, unknown>;
  return (
    <View style={containerStyle as ViewStyle}>
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
          <Text
            style={{
              flex: 1,
              fontSize: THEME.FONT_SIZES.body,
              color: (color as string | undefined) ?? THEME.COLORS.text,
            }}
          >
            {item}
          </Text>
        </View>
      ))}
    </View>
  );
}
