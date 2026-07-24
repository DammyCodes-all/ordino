import type { DocumentState } from "../contracts/document";
import type { InternalRenderResult } from "../contracts/rendering";
import type {
  ValidationIssue,
  ValidationReport,
} from "../contracts/validation";

function makeIssue(
  code: ValidationIssue["code"],
  severity: "warning" | "error",
  message: string,
  pageNumber: number | null = null,
): ValidationIssue {
  return {
    source: "pdf",
    code: code as any,
    severity,
    message,
    nodeId: null,
    pageNumber,
  };
}

export async function validatePdf(
  document: DocumentState,
  render?: InternalRenderResult,
): Promise<ValidationReport> {
  const issues: ValidationIssue[] = [];

  if (render) {
    if (
      document.meta.pageLimit !== null &&
      render.pageCount > document.meta.pageLimit
    ) {
      issues.push(
        makeIssue(
          "PAGE_LIMIT_EXCEEDED",
          "warning",
          `Document has ${render.pageCount} pages, limit is ${document.meta.pageLimit}.`,
        ),
      );
    }

    if (render.pageTexts) {
      for (let i = 0; i < render.pageTexts.length; i++) {
        const text = render.pageTexts[i].trim();
        if (text.length === 0) {
          issues.push(
            makeIssue(
              "BLANK_PAGE",
              "error",
              `Page ${i + 1} contains no text content.`,
              i + 1,
            ),
          );
        } else if (text.length < 50) {
          issues.push(
            makeIssue(
              "LOW_CONTENT_PAGE",
              "warning",
              `Page ${i + 1} has very little text (${text.length} characters).`,
              i + 1,
            ),
          );
        }
      }
    }
  }

  return {
    documentVersion: document.version,
    pass: issues.length === 0,
    issues,
  };
}

export default validatePdf;
