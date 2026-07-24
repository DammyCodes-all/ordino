import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { DocumentState, DocumentNode, TableColumn } from "../../contracts/document";
import theme from "../theme";

const styles = StyleSheet.create({
  page: {
    padding: theme.DEFAULT_MARGIN,
    fontSize: theme.DEFAULT_FONT_SIZE,
    fontFamily: theme.DEFAULT_FONT_FAMILY,
  },
  title: { fontSize: 18, marginBottom: 8 },
  node: { marginBottom: 6 },
  heading1: { fontSize: 20, fontWeight: 700, marginBottom: 6 },
  heading2: { fontSize: 16, fontWeight: 700, marginBottom: 6 },
  heading3: { fontSize: 14, fontWeight: 700, marginBottom: 6 },
  paragraph: { fontSize: theme.DEFAULT_FONT_SIZE, marginBottom: 6 },
  listItem: { flexDirection: "row", marginBottom: 4 },
  listBullet: { width: 12 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#eee", paddingVertical: 4 },
  tableCell: { paddingHorizontal: 6 },
  divider: { height: 1, backgroundColor: "#ddd", marginVertical: 8 },
  quote: { fontStyle: "italic", marginLeft: 8, paddingLeft: 8, borderLeftWidth: 2, borderColor: "#ccc" },
  callout: { padding: 8, backgroundColor: "#f7f7f7", borderRadius: 4, marginBottom: 8 },
});

function renderNode(node: DocumentNode) {
  switch (node.type) {
    case "heading":
      return (
        <Text key={node.id} style={node.level === 1 ? styles.heading1 : node.level === 2 ? styles.heading2 : styles.heading3}>
          {node.text}
        </Text>
      );
    case "paragraph":
      return (
        <Text key={node.id} style={styles.paragraph}>
          {node.text}
        </Text>
      );
    case "list":
      return (
        <View key={node.id}>
          {node.items.map((item, idx) => (
            <View key={`${node.id}-item-${idx}`} style={styles.listItem}>
              <Text style={styles.listBullet}>{node.ordered ? `${idx + 1}.` : "•"}</Text>
              <Text>{item}</Text>
            </View>
          ))}
        </View>
      );
    case "table":
      return (
        <View key={node.id}>
          <View style={{ flexDirection: "row", marginBottom: 4 }}>
            {node.columns.map((col: TableColumn, ci: number) => (
              <View key={`${node.id}-col-${ci}`} style={{ flex: col.widthPercent ? col.widthPercent : 1 }}>
                <Text style={{ fontWeight: 700 }}>{col.header}</Text>
              </View>
            ))}
          </View>
          {node.rows.map((row, ri) => (
            <View key={`${node.id}-row-${ri}`} style={styles.tableRow}>
              {row.map((cell, ci) => (
                <View key={`${node.id}-row-${ri}-cell-${ci}`} style={{ ...styles.tableCell, flex: node.columns[ci].widthPercent ? node.columns[ci].widthPercent : 1 }}>
                  <Text>{cell}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    case "quote":
      return (
        <View key={node.id}>
          <Text style={styles.quote}>{node.text}</Text>
          {node.attribution ? <Text style={{ textAlign: "right", marginTop: 4 }}>— {node.attribution}</Text> : null}
        </View>
      );
    case "callout":
      return (
        <View key={node.id} style={styles.callout}>
          {node.title ? <Text style={{ fontWeight: 700 }}>{node.title}</Text> : null}
          <Text>{node.text}</Text>
        </View>
      );
    case "divider":
      return <View key={node.id} style={styles.divider} />;
    case "page_break":
      return null;
    default:
      return (
        <Text key={(node as any).id}>{JSON.stringify(node as any)}</Text>
      );
  }
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

  return (
    <Document>
      {pages.map((nodes, pi) => (
        <Page key={`page-${pi}`} size={theme.PAGE_SIZE} style={styles.page} wrap>
          <View>
            {pi === 0 ? <Text style={styles.title}>{document.meta.title || "Untitled"}</Text> : null}
          </View>
          {nodes.map((n) => renderNode(n))}
        </Page>
      ))}
    </Document>
  );
}

export default DocumentRenderer;
