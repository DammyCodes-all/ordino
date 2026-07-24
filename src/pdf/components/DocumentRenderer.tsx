import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { DocumentState } from "../../contracts/document";
import theme from "../theme";

const styles = StyleSheet.create({
  page: {
    padding: theme.DEFAULT_MARGIN,
    fontSize: theme.DEFAULT_FONT_SIZE,
    fontFamily: theme.DEFAULT_FONT_FAMILY,
  },
  title: { fontSize: 18, marginBottom: 8 },
  node: { marginBottom: 6 },
});

export function DocumentRenderer({ document }: { document: DocumentState }) {
  return (
    <Document>
      <Page size={theme.PAGE_SIZE} style={styles.page} wrap>
        <View>
          <Text style={styles.title}>{document.meta.title || "Untitled"}</Text>
        </View>

        {document.nodes.map((n) => (
          <View key={n.id} style={styles.node}>
            <Text>
              {n.type}:{" "}
              {"text" in n && typeof n.text === "string"
                ? n.text
                : JSON.stringify(n)}
            </Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}

export default DocumentRenderer;
