import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { DocumentNode, DocumentState } from "../../contracts/document";
import { THEME } from "../professional-theme";
import { CalloutNode } from "./callout-node";
import { DividerNode } from "./divider-node";
import { HeadingNode } from "./heading-node";
import { ListNode } from "./list-node";
import { PageBreakNode } from "./page-break-node";
import { ParagraphNode } from "./paragraph-node";
import { QuoteNode } from "./quote-node";
import { TableNode } from "./table-node";

const PAGE_STYLE = {
  paddingTop: THEME.MARGIN.top,
  paddingBottom: THEME.MARGIN.bottom,
  paddingLeft: THEME.MARGIN.left,
  paddingRight: THEME.MARGIN.right,
};

export function chunkByPageBreaks(nodes: DocumentNode[]): DocumentNode[][] {
  const pages: DocumentNode[][] = [[]];
  for (const node of nodes) {
    if (node.type === "page_break") {
      pages.push([]);
      continue;
    }
    pages[pages.length - 1]?.push(node);
  }
  const filtered = pages.filter((page) => page.length > 0);
  return filtered.length > 0 ? filtered : [[]];
}

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
  const pages = chunkByPageBreaks(document.nodes);
  const title = document.meta.title || "Untitled";

  return (
    <Document
      title={document.meta.title}
      author="Ordino"
      subject={document.meta.documentType}
    >
      {pages.map((nodes, pageIndex) => (
        <Page
          key={`page-${pageIndex}-${nodes[0]?.id ?? "empty"}`}
          size={THEME.PAGE_SIZE}
          style={PAGE_STYLE}
          wrap
        >
          {pageIndex === 0 ? (
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
          {nodes.map((node) => renderNode(node))}
          <PageFooter pageNumber={pageIndex + 1} title={title} />
        </Page>
      ))}
    </Document>
  );
}

export default DocumentRenderer;
