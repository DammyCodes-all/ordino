"use client";

import { pdf } from "@react-pdf/renderer";
import { createAgent } from "@/agent";
import type {
  AgentPort,
  AgentRuntimeDependencies,
  DocumentState,
  ExportResult,
  GoogleAIConfiguration,
  InternalRenderResult,
  PdfPort,
  WorkflowEvent,
} from "@/contracts";
import { DEFAULT_GOOGLE_AI_CONFIGURATION } from "@/contracts";
import { createDocumentPort, validateDocument } from "@/document";
import { createErrorResult, createSuccessResult } from "@/google-ai";
import { slugifyFilename } from "@/lib/pdf-filename";
import {
  chunkByPageBreaks,
  DocumentRenderer,
} from "@/pdf/components/DocumentRenderer";

/**
 * Browser-safe PdfPort using A's DocumentRenderer + toBlob.
 * Does not import `@/pdf` (Node toBuffer / canvas / pdfjs legacy).
 */
class BrowserPdfPort implements PdfPort {
  async render(
    document: DocumentState,
    signal?: AbortSignal,
  ): ReturnType<PdfPort["render"]> {
    if (signal?.aborted) {
      return createErrorResult("ABORTED", "Render aborted.", false);
    }
    try {
      const pdfBlob = await pdf(
        <DocumentRenderer document={document} />,
      ).toBlob();
      if (signal?.aborted) {
        return createErrorResult("ABORTED", "Render aborted.", false);
      }
      const pages = chunkByPageBreaks(document.nodes);
      return createSuccessResult({
        documentId: document.documentId,
        documentVersion: document.version,
        pdfBlob,
        pageCount: Math.max(1, pages.length),
        renderedAt: new Date().toISOString(),
      });
    } catch (error) {
      return createErrorResult(
        "RENDER_FAILED",
        error instanceof Error ? error.message : "PDF render failed.",
        true,
      );
    }
  }

  async rasterize(
    render: InternalRenderResult,
    signal?: AbortSignal,
  ): ReturnType<PdfPort["rasterize"]> {
    if (signal?.aborted) {
      return createErrorResult("ABORTED", "Rasterize aborted.", false);
    }
    // Browser stub until a server rasterize route exists (Node canvas).
    return createSuccessResult(
      Array.from({ length: Math.max(1, render.pageCount) }, (_, index) => ({
        documentVersion: render.documentVersion,
        pageNumber: index + 1,
        mimeType: "image/png" as const,
        dataUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        widthPx: 100,
        heightPx: 100,
      })),
    );
  }

  async export(
    document: DocumentState,
    existingRender?: InternalRenderResult,
    signal?: AbortSignal,
  ): ReturnType<PdfPort["export"]> {
    if (
      existingRender &&
      existingRender.documentId === document.documentId &&
      existingRender.documentVersion === document.version
    ) {
      return createSuccessResult({
        documentId: document.documentId,
        documentVersion: document.version,
        filename: slugifyFilename(document.meta.title, document.version),
        blob: existingRender.pdfBlob,
      } satisfies ExportResult);
    }

    const rendered = await this.render(document, signal);
    if (!rendered.success) {
      return rendered;
    }
    return createSuccessResult({
      documentId: document.documentId,
      documentVersion: document.version,
      filename: slugifyFilename(document.meta.title, document.version),
      blob: rendered.data.pdfBlob,
    });
  }
}

function passPdfValidation(document: DocumentState) {
  return {
    documentVersion: document.version,
    pass: true,
    issues: [],
  };
}

export type ComposeAgentOptions = {
  onEvent: (event: WorkflowEvent) => void;
  configuration?: GoogleAIConfiguration;
};

/** Compose B's agent with A's document port + browser-safe PDF render. */
export function composeAgent(options: ComposeAgentOptions): AgentPort {
  const document = createDocumentPort();
  const pdfPort = new BrowserPdfPort();

  const dependencies: AgentRuntimeDependencies = {
    document,
    pdf: pdfPort,
    validateDocument,
    validatePdf: async (doc) => passPdfValidation(doc),
    onEvent: options.onEvent,
  };

  return createAgent(
    dependencies,
    options.configuration ?? DEFAULT_GOOGLE_AI_CONFIGURATION,
  );
}

export function createSessionPdfPort(): PdfPort {
  return new BrowserPdfPort();
}

export function createSessionDocumentPort() {
  return createDocumentPort();
}
