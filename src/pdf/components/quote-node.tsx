import { Text, View } from "@react-pdf/renderer";
import type { DocumentNode } from "../../contracts/document";
import { resolveQuoteStyle, THEME } from "../professional-theme";

type QuoteData = Extract<DocumentNode, { type: "quote" }>;

export function QuoteNode({ node }: { node: QuoteData }) {
  const style = resolveQuoteStyle(node.style);
  return (
    <View
      style={{
        marginTop: style.marginTop as number,
        marginBottom: style.marginBottom as number,
        borderLeftWidth: style.borderLeftWidth as number,
        borderLeftColor: style.borderLeftColor as string,
        paddingLeft: style.paddingLeft as number,
      }}
    >
      <Text
        style={{
          fontSize: style.fontSize as number,
          fontFamily: style.fontFamily as string | undefined,
          color: style.color as string,
          fontStyle: style.fontStyle as "italic",
          textAlign: style.textAlign as "left" | "center",
          lineHeight: style.lineHeight as number,
        }}
      >
        {node.text}
      </Text>
      {node.attribution ? (
        <Text
          style={{
            fontSize: THEME.FONT_SIZES.small,
            color: THEME.COLORS.muted,
            textAlign: "right",
            marginTop: 4,
          }}
        >
          {"\u2014 "}
          {node.attribution}
        </Text>
      ) : null}
    </View>
  );
}
