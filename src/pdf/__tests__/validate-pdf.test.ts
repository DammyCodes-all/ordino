import { describe, it, expect, vi } from "vitest";
import { validatePdf } from "../validate-pdf";
import { createDocument } from "../../document/create-document";
import { professionalDocumentFixture } from "../../document/fixtures";
import type { InternalRenderResult } from "../../contracts/rendering";
import { Blob as NodeBlob } from "buffer";

function makeRender(
  overrides: Partial<InternalRenderResult> = {},
): InternalRenderResult {
  return {
    documentId: "00000000-0000-0000-0000-000000000001" as any,
    documentVersion: 1,
    pdfBlob: new NodeBlob([new Uint8Array([1, 2, 3])], {
      type: "application/pdf",
    }),
    pageCount: 3,
    renderedAt: new Date().toISOString(),
    ...overrides,
  } as InternalRenderResult;
}

describe("validatePdf", () => {
  it("returns pass with no render provided", async () => {
    const doc = createDocument(professionalDocumentFixture.meta as any);
    const report = await validatePdf(doc);
    expect(report.pass).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("reports PAGE_LIMIT_EXCEEDED when page count exceeds limit", async () => {
    const doc = createDocument({
      ...professionalDocumentFixture.meta,
      pageLimit: 2,
    } as any);
    const render = makeRender({ pageCount: 5 });
    const report = await validatePdf(doc, render);
    expect(report.pass).toBe(false);
    expect(report.issues.some((i) => i.code === "PAGE_LIMIT_EXCEEDED")).toBe(
      true,
    );
  });

  it("does not report PAGE_LIMIT_EXCEEDED when under limit", async () => {
    const doc = createDocument({
      ...professionalDocumentFixture.meta,
      pageLimit: 10,
    } as any);
    const render = makeRender({ pageCount: 3 });
    const report = await validatePdf(doc, render);
    expect(report.issues.some((i) => i.code === "PAGE_LIMIT_EXCEEDED")).toBe(
      false,
    );
  });

  it("does not report PAGE_LIMIT_EXCEEDED when pageLimit is null", async () => {
    const doc = createDocument(professionalDocumentFixture.meta as any);
    const render = makeRender({ pageCount: 100 });
    const report = await validatePdf(doc, render);
    expect(report.issues.some((i) => i.code === "PAGE_LIMIT_EXCEEDED")).toBe(
      false,
    );
  });

  it("reports BLANK_PAGE for pages with empty text", async () => {
    const doc = createDocument(professionalDocumentFixture.meta as any);
    const render = makeRender({
      pageCount: 3,
      pageTexts: ["Some content", "", "More content"],
    });
    const report = await validatePdf(doc, render);
    expect(report.issues.some((i) => i.code === "BLANK_PAGE")).toBe(true);
    const blankIssue = report.issues.find((i) => i.code === "BLANK_PAGE");
    expect(blankIssue?.pageNumber).toBe(2);
  });

  it("reports LOW_CONTENT_PAGE for pages with very little text", async () => {
    const doc = createDocument(professionalDocumentFixture.meta as any);
    const render = makeRender({
      pageCount: 2,
      pageTexts: ["Hi", "Normal content here with enough text to pass"],
    });
    const report = await validatePdf(doc, render);
    expect(report.issues.some((i) => i.code === "LOW_CONTENT_PAGE")).toBe(true);
    const lowIssue = report.issues.find((i) => i.code === "LOW_CONTENT_PAGE");
    expect(lowIssue?.pageNumber).toBe(1);
  });

  it("does not report issues when all pages have sufficient content", async () => {
    const doc = createDocument(professionalDocumentFixture.meta as any);
    const render = makeRender({
      pageCount: 2,
      pageTexts: [
        "This page has plenty of text content for validation.",
        "This page also has plenty of text content for validation.",
      ],
    });
    const report = await validatePdf(doc, render);
    expect(report.pass).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("handles missing pageTexts gracefully", async () => {
    const doc = createDocument(professionalDocumentFixture.meta as any);
    const render = makeRender({ pageCount: 2 });
    const report = await validatePdf(doc, render);
    expect(report.pass).toBe(true);
  });
});
