import type { DocumentState } from "../contracts/document";
import type {
  ValidationIssue,
  ValidationReport,
} from "../contracts/validation";

function makeIssue(
  source: "document" | "pdf",
  code: ValidationIssue["code"],
  severity: "warning" | "error",
  message: string,
  nodeId: string | null = null,
  pageNumber: number | null = null,
): ValidationIssue {
  return {
    source,
    code: code as any,
    severity,
    message,
    nodeId: nodeId as any,
    pageNumber,
  } as ValidationIssue;
}

export function validateDocument(document: DocumentState): ValidationReport {
  const issues: ValidationIssue[] = [];

  // Leading/trailing/consecutive page breaks
  if (document.nodes.length > 0) {
    const first = document.nodes[0];
    const last = document.nodes[document.nodes.length - 1];
    if (first.type === "page_break") {
      issues.push(
        makeIssue(
          "document",
          "INVALID_PAGE_BREAK",
          "error",
          "Document starts with a page break.",
          first.id,
        ),
      );
    }
    if (last.type === "page_break") {
      issues.push(
        makeIssue(
          "document",
          "INVALID_PAGE_BREAK",
          "error",
          "Document ends with a page break.",
          last.id,
        ),
      );
    }
    for (let i = 0; i < document.nodes.length - 1; i++) {
      if (
        document.nodes[i].type === "page_break" &&
        document.nodes[i + 1].type === "page_break"
      ) {
        issues.push(
          makeIssue(
            "document",
            "CONSECUTIVE_PAGE_BREAKS",
            "error",
            "Consecutive page breaks detected.",
            document.nodes[i].id,
          ),
        );
      }
    }
  }

  // Heading level jumps and trailing heading
  let lastHeadingLevel: number | null = null;
  for (let i = 0; i < document.nodes.length; i++) {
    const node = document.nodes[i] as any;
    if (node.type === "heading") {
      const level: number = node.level;
      if (lastHeadingLevel !== null && level - lastHeadingLevel > 1) {
        issues.push(
          makeIssue(
            "document",
            "HEADING_LEVEL_JUMP",
            "warning",
            `Heading level jumps from ${lastHeadingLevel} to ${level}.`,
            node.id,
          ),
        );
      }
      lastHeadingLevel = level;
    }
  }
  if (document.nodes.length > 0) {
    const last = document.nodes[document.nodes.length - 1] as any;
    if (last.type === "heading") {
      issues.push(
        makeIssue(
          "document",
          "TRAILING_HEADING",
          "warning",
          "Document ends with a heading.",
          last.id,
        ),
      );
    }
  }

  // Empty text checks
  for (const node of document.nodes as any[]) {
    if (
      node.type === "paragraph" ||
      node.type === "quote" ||
      node.type === "callout" ||
      node.type === "heading"
    ) {
      const text = (node.text ?? node.title ?? "").trim();
      if (!text) {
        issues.push(
          makeIssue(
            "document",
            "EMPTY_TEXT_NODE",
            "error",
            `Empty text in ${node.type} node.`,
            node.id,
          ),
        );
      }
    }
    if (node.type === "list") {
      if (!Array.isArray(node.items) || node.items.length === 0) {
        issues.push(
          makeIssue(
            "document",
            "EMPTY_TEXT_NODE",
            "error",
            `List node has no items.`,
            node.id,
          ),
        );
      } else {
        for (const item of node.items) {
          if (!String(item).trim()) {
            issues.push(
              makeIssue(
                "document",
                "EMPTY_TEXT_NODE",
                "error",
                `Empty list item in list node.`,
                node.id,
              ),
            );
            break;
          }
        }
      }
    }
    if (node.type === "table") {
      const cols = node.columns || [];
      const rows = node.rows || [];
      for (const [ri, row] of rows.entries()) {
        if (!Array.isArray(row) || row.length !== cols.length) {
          issues.push(
            makeIssue(
              "document",
              "TABLE_COLUMN_MISMATCH",
              "error",
              `Row ${ri} length does not match columns.`,
              node.id,
            ),
          );
        }
        for (const [ci, cell] of (row || []).entries()) {
          if (!String(cell).trim()) {
            issues.push(
              makeIssue(
                "document",
                "EMPTY_TABLE_CELL",
                "error",
                `Empty table cell at row ${ri + 1}, col ${ci + 1}.`,
                node.id,
              ),
            );
          }
        }
      }
      const widths = cols.map((c: any) => c.widthPercent);
      const hasWidths = widths.some((w: any) => w !== null && w !== undefined);
      const hasMissing = widths.some((w: any) => w === null || w === undefined);
      if (hasWidths && hasMissing) {
        issues.push(
          makeIssue(
            "document",
            "TABLE_COLUMN_MISMATCH",
            "error",
            "Table widths must be all specified or all null.",
            node.id,
          ),
        );
      }
      if (hasWidths) {
        const total = widths.reduce((s: number, w: number) => s + (w ?? 0), 0);
        if (Math.abs(total - 100) > 0.01) {
          issues.push(
            makeIssue(
              "document",
              "TABLE_COLUMN_MISMATCH",
              "error",
              "Table width percentages must total 100%.",
              node.id,
            ),
          );
        }
      }
    }
  }

  const report: ValidationReport = {
    documentVersion: document.version,
    pass: issues.length === 0,
    issues,
  };

  return report;
}

export default validateDocument;
