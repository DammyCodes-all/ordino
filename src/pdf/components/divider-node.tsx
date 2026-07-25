import { View } from "@react-pdf/renderer";
import type { DocumentNode } from "../../contracts/document";
import { resolveDividerStyle, THEME } from "../professional-theme";

type DividerData = Extract<DocumentNode, { type: "divider" }>;

export function DividerNode({ node }: { node: DividerData }) {
  const resolved = resolveDividerStyle(node.style);
  const customColor = resolved.color as string | undefined;
  const variant = resolved.variant as "solid" | "subtle";
  const backgroundColor = customColor
    ? customColor
    : variant === "subtle"
      ? THEME.DIVIDER.subtleColor
      : THEME.DIVIDER.color;
  return (
    <View
      style={{
        marginTop: resolved.marginTop as number,
        marginBottom: resolved.marginBottom as number,
        height: THEME.DIVIDER.height,
        backgroundColor,
      }}
    />
  );
}
