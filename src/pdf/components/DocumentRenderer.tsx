import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { DocumentNode, DocumentState } from "../../contracts/document";
import theme from "../theme";

const styles = StyleSheet.create({
  page: {
    paddingTop: theme.DEFAULT_MARGIN + 14,
    paddingBottom: theme.DEFAULT_MARGIN + 14,
    paddingHorizontal: theme.DEFAULT_MARGIN + 14,
    fontFamily: theme.DEFAULT_FONT_FAMILY,
    fontSize: theme.DEFAULT_FONT_SIZE,
    lineHeight: 1.45,
    color: "#1a1a1a",
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: "#737373",
    marginBottom: 10,
  },
  h1: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    marginBottom: 14,
    lineHeight: 1.25,
  },
  h2: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginTop: 16,
    marginBottom: 8,
  },
  h3: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: {
    marginBottom: 10,
    color: "#2a2a2a",
  },
  listItem: {
    marginBottom: 4,
    paddingLeft: 8,
  },
  quote: {
    marginVertical: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#c4c4c4",
    color: "#404040",
    fontStyle: "italic",
  },
  callout: {
    marginVertical: 12,
    padding: 12,
    backgroundColor: "#f4f4f5",
  },
  calloutTitle: {
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
    fontSize: 10,
  },
  table: {
    marginVertical: 12,
    borderWidth: 1,
    borderColor: "#d4d4d8",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e4e4e7",
  },
  tableHeader: {
    backgroundColor: "#f4f4f5",
  },
  tableCell: {
    flex: 1,
    padding: 8,
    fontSize: 10,
  },
  divider: {
    marginVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#d4d4d8",
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: theme.DEFAULT_MARGIN + 14,
    right: theme.DEFAULT_MARGIN + 14,
    fontSize: 9,
    color: "#a1a1aa",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

function NodeBlock({ node }: { node: DocumentNode }) {
  switch (node.type) {
    case "heading":
      return (
        <Text
          style={
            node.level === 1
              ? styles.h1
              : node.level === 2
                ? styles.h2
                : styles.h3
          }
        >
          {node.text}
        </Text>
      );
    case "paragraph":
      return <Text style={styles.paragraph}>{node.text}</Text>;
    case "list":
      return (
        <View style={{ marginBottom: 10 }}>
          {node.items.map((item, index) => (
            <Text key={`${node.id}-${index}`} style={styles.listItem}>
              {node.ordered ? `${index + 1}. ` : "• "}
              {item}
            </Text>
          ))}
        </View>
      );
    case "quote":
      return (
        <View style={styles.quote}>
          <Text>{node.text}</Text>
          {node.attribution ? (
            <Text style={{ marginTop: 6, fontSize: 9 }}>
              — {node.attribution}
            </Text>
          ) : null}
        </View>
      );
    case "callout":
      return (
        <View style={styles.callout}>
          {node.title ? (
            <Text style={styles.calloutTitle}>{node.title}</Text>
          ) : null}
          <Text>{node.text}</Text>
        </View>
      );
    case "table":
      return (
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            {node.columns.map((column) => (
              <Text key={column.header} style={styles.tableCell}>
                {column.header}
              </Text>
            ))}
          </View>
          {node.rows.map((row, rowIndex) => (
            <View key={`${node.id}-row-${rowIndex}`} style={styles.tableRow}>
              {row.map((cell, cellIndex) => (
                <Text
                  key={`${node.id}-${rowIndex}-${cellIndex}`}
                  style={styles.tableCell}
                >
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </View>
      );
    case "divider":
      return <View style={styles.divider} />;
    case "page_break":
      return null;
    default:
      return null;
  }
}

export function chunkByPageBreaks(nodes: DocumentNode[]): DocumentNode[][] {
  const pages: DocumentNode[][] = [[]];
  for (const node of nodes) {
    if (node.type === "page_break") {
      pages.push([]);
      continue;
    }
    pages[pages.length - 1]?.push(node);
  }
  return pages.filter((page) => page.length > 0);
}

export function DocumentRenderer({ document }: { document: DocumentState }) {
  const pages = chunkByPageBreaks(document.nodes);
  const pageNodes = pages.length > 0 ? pages : [[]];

  return (
    <Document
      title={document.meta.title}
      author="Ordino"
      subject={document.meta.documentType}
    >
      {pageNodes.map((nodes, pageIndex) => (
        <Page
          key={`page-${pageIndex}-${nodes[0]?.id ?? "empty"}`}
          size={theme.PAGE_SIZE}
          style={styles.page}
        >
          {pageIndex === 0 ? (
            <Text style={styles.eyebrow}>{document.meta.documentType}</Text>
          ) : null}
          {nodes.map((node) => (
            <NodeBlock key={node.id} node={node} />
          ))}
          <View style={styles.footer} fixed>
            <Text>{document.meta.title}</Text>
            <Text
              render={({ pageNumber, totalPages }) =>
                `${pageNumber} / ${totalPages}`
              }
            />
          </View>
        </Page>
      ))}
    </Document>
  );
}

export default DocumentRenderer;
