import { Text, View } from "@react-pdf/renderer";
import type { DocumentNode } from "../../contracts/document";
import { resolveCalloutStyle, THEME } from "../professional-theme";

type CalloutData = Extract<DocumentNode, { type: "callout" }>;

export function CalloutNode({ node }: { node: CalloutData }) {
  const resolved = resolveCalloutStyle(node.style);
  return (
    <View
      style={{
        marginTop: resolved.marginTop as number,
        marginBottom: resolved.marginBottom as number,
        backgroundColor: resolved.backgroundColor as string,
        borderLeftWidth: resolved.borderLeftWidth as number,
        borderLeftColor: resolved.borderLeftColor as string,
        paddingLeft: resolved.paddingLeft as number,
        paddingRight: resolved.paddingRight as number,
        paddingTop: resolved.paddingTop as number,
        paddingBottom: resolved.paddingBottom as number,
      }}
    >
      {node.title ? (
        <Text
          style={{
            fontWeight: 700,
            fontSize: THEME.FONT_SIZES.body,
            color: resolved.color as string,
            marginBottom: 4,
          }}
        >
          {node.title}
        </Text>
      ) : null}
      <Text
        style={{
          fontSize: resolved.fontSize as number,
          color: resolved.color as string,
          lineHeight: resolved.lineHeight as number,
        }}
      >
        {node.text}
      </Text>
    </View>
  );
}
