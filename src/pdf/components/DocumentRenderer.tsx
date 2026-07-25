import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { DocumentNode, DocumentState } from "../../contracts/document";
import { resolveMargins, resolvePageSize, THEME } from "../professional-theme";
import { CalloutNode } from "./callout-node";
import { DividerNode } from "./divider-node";
import { HeadingNode } from "./heading-node";
import { ListNode } from "./list-node";
import { PageBreakNode } from "./page-break-node";
import { ParagraphNode } from "./paragraph-node";
import { QuoteNode } from "./quote-node";
import { TableNode } from "./table-node";

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
  margins,
}: {
  pageNumber: number;
  title: string;
  margins: { left: number; right: number };
}) {
  return (
    <View
      fixed
      style={{
        position: "absolute",
        bottom: 20,
        left: margins.left,
        right: margins.right,
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

function PageHeader({
  pageNumber,
  title,
  margins,
}: {
  pageNumber: number;
  title: string;
  margins: { left: number; right: number };
}) {
  return (
    <View
      fixed
      style={{
        position: "absolute",
        top: 20,
        left: margins.left,
        right: margins.right,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Text style={THEME.PAGE_NUMBER_STYLE}>{pageNumber}</Text>
      <Text style={THEME.FOOTER_STYLE}>{title}</Text>
    </View>
  );
}

export function DocumentRenderer({ document }: { document: DocumentState }) {
  const pages = chunkByPageBreaks(document.nodes);
  const title = document.meta.title || "Untitled";
  const pageSize = resolvePageSize(document.meta.pageSize);
  const margins = resolveMargins(document.meta.margin);
  const pageStyle = {
    paddingTop: margins.top,
    paddingBottom: margins.bottom,
    paddingLeft: margins.left,
    paddingRight: margins.right,
  };

  return (
    <Document
      title={document.meta.title}
      author="Ordino"
      subject={document.meta.documentType}
    >
      {pages.map((nodes, pageIndex) => (
        <Page
          key={`page-${pageIndex}-${nodes[0]?.id ?? "empty"}`}
          size={pageSize}
          style={pageStyle}
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
          {document.meta.header?.enabled &&
          !(pageIndex === 0 && document.meta.header?.skipFirstPage) ? (
            <PageHeader
              pageNumber={pageIndex + 1}
              title={title}
              margins={margins}
            />
          ) : null}
          <PageFooter
            pageNumber={pageIndex + 1}
            title={title}
            margins={margins}
          />
        </Page>
      ))}
    </Document>
  );
}

export default DocumentRenderer;
