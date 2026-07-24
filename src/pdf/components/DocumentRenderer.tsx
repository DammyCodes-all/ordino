import React from "react";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import type { DocumentState, DocumentNode } from "../../contracts/document";
import { THEME } from "../professional-theme";
import { HeadingNode } from "./heading-node";
import { ParagraphNode } from "./paragraph-node";
import { ListNode } from "./list-node";
import { TableNode } from "./table-node";
import { QuoteNode } from "./quote-node";
import { CalloutNode } from "./callout-node";
import { DividerNode } from "./divider-node";
import { PageBreakNode } from "./page-break-node";

const PAGE_STYLE = {
  paddingTop: THEME.MARGIN.top,
  paddingBottom: THEME.MARGIN.bottom,
  paddingLeft: THEME.MARGIN.left,
  paddingRight: THEME.MARGIN.right,
};

function renderNode(node: DocumentNode) {
  switch (node.type) {
    case "heading":
      return <HeadingNode key={node.id} node={node} />;
    case "paragraph":
      return <ParagraphNode key={node.id} node={node} />;
    case "list":
      return <ListNode key={node.id} node={node} />;
    case "table":
      return <TableNode key={node.id} node={node} />;
    case "quote":
      return <QuoteNode key={node.id} node={node} />;
    case "callout":
      return <CalloutNode key={node.id} node={node} />;
    case "divider":
      return <DividerNode key={node.id} node={node} />;
    case "page_break":
      return <PageBreakNode key={node.id} />;
    default:
      return null;
  }
}

function PageFooter({
  pageNumber,
  title,
}: {
  pageNumber: number;
  title: string;
}) {
  return (
    <View
      fixed
      style={{
        position: "absolute",
        bottom: 20,
        left: THEME.MARGIN.left,
        right: THEME.MARGIN.right,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Text style={THEME.FOOTER_STYLE}>{title}</Text>
      <Text style={THEME.PAGE_NUMBER_STYLE}>{pageNumber}</Text>
    </View>
  );
}

export function DocumentRenderer({ document }: { document: DocumentState }) {
  const pages: DocumentNode[][] = [];
  let current: DocumentNode[] = [];
  for (const n of document.nodes) {
    if (n.type === "page_break") {
      pages.push(current);
      current = [];
    } else {
      current.push(n);
    }
  }
  pages.push(current);

  const title = document.meta.title || "Untitled";

  return (
    <Document>
      {pages.map((nodes, pi) => (
        <Page key={`page-${pi}`} size={THEME.PAGE_SIZE} style={PAGE_STYLE} wrap>
          {pi === 0 ? (
            <Text
              style={{
                fontSize: THEME.FONT_SIZES.title,
                fontWeight: 700,
                color: THEME.COLORS.text,
                marginBottom: 20,
                lineHeight: THEME.LINE_HEIGHT.tight,
              }}
            >
              {title}
            </Text>
          ) : null}
          {nodes.map((n) => renderNode(n))}
          <PageFooter pageNumber={pi + 1} title={title} />
        </Page>
      ))}
    </Document>
  );
}

export default DocumentRenderer;
