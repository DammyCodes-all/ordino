import { Text, View } from "@react-pdf/renderer";
import type {
  DocumentNode,
  TableColumn,
  TableStyle,
} from "../../contracts/document";
import { resolveTableStyle, THEME } from "../professional-theme";

type TableNodeData = Extract<DocumentNode, { type: "table" }>;

function columnFlex(col: TableColumn, totalColumns: number): number {
  if (col.widthPercent !== null) return col.widthPercent;
  return 100 / totalColumns;
}

export function TableNode({ node }: { node: TableNodeData }) {
  const containerStyle = resolveTableStyle(node.style);
  const totalCols = node.columns.length;

  return (
    <View style={containerStyle as any}>
      <View
        style={{
          flexDirection: "row",
          backgroundColor: THEME.COLORS.tableHeaderBg,
          borderBottomWidth: THEME.TABLE.headerBorderWidth,
          borderBottomColor: THEME.TABLE.borderColor,
        }}
      >
        {node.columns.map((col: TableColumn, ci: number) => (
          <View
            key={`${node.id}-header-${ci}`}
            style={{
              flex: columnFlex(col, totalCols),
              paddingHorizontal: 6,
              paddingVertical: 6,
            }}
          >
            <Text
              style={{
                fontWeight: 700,
                fontSize: THEME.FONT_SIZES.body,
                color: (containerStyle as any).color ?? THEME.COLORS.text,
                textAlign: node.style.headerAlignment,
              }}
            >
              {col.header}
            </Text>
          </View>
        ))}
      </View>
      {node.rows.map((row: string[], ri: number) => (
        <View
          key={`${node.id}-row-${ri}`}
          style={{
            flexDirection: "row",
            borderBottomWidth: THEME.TABLE.borderWidth,
            borderBottomColor: THEME.TABLE.borderColor,
            backgroundColor:
              node.style.striped && ri % 2 === 1
                ? THEME.COLORS.tableStripeBg
                : "transparent",
            paddingVertical: node.style.density === "compact" ? 3 : 6,
          }}
        >
          {row.map((cell: string, ci: number) => (
            <View
              key={`${node.id}-row-${ri}-cell-${ci}`}
              style={{
                flex: columnFlex(node.columns[ci], totalCols),
                paddingHorizontal: 6,
              }}
            >
              <Text
                style={{
                  fontSize: THEME.FONT_SIZES.body,
                  fontFamily: (containerStyle as any).fontFamily,
                  color: (containerStyle as any).color ?? THEME.COLORS.text,
                }}
              >
                {cell}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
