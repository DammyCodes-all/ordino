"use client";

import { createAgent, FakeDocumentPort } from "@/agent";
import { renderFakePdfBlob } from "@/components/pdf-preview/fake-pdf-document";
import type {
  AgentPort,
  AgentRuntimeDependencies,
  DocumentState,
  ExportResult,
  GoogleAIConfiguration,
  InternalRenderResult,
  PdfPort,
  ValidationReport,
  WorkflowEvent,
} from "@/contracts";
import { DEFAULT_GOOGLE_AI_CONFIGURATION } from "@/contracts";
import { createErrorResult, createSuccessResult } from "@/google-ai";

/** Temporary PDF port until Teammate A's `createPdfPort` merges. */
class TemporaryPdfPort implements PdfPort {
  async render(
    document: DocumentState,
    signal?: AbortSignal,
  ): ReturnType<PdfPort["render"]> {
    if (signal?.aborted) {
      return createErrorResult("ABORTED", "Render aborted.", false);
    }
    try {
      const pdfBlob = await renderFakePdfBlob(document);
      if (signal?.aborted) {
        return createErrorResult("ABORTED", "Render aborted.", false);
      }
      return createSuccessResult({
        documentId: document.documentId,
        documentVersion: document.version,
        pdfBlob,
        pageCount: Math.max(1, Math.ceil(document.nodes.length / 8)),
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
    return createSuccessResult([
      {
        documentVersion: render.documentVersion,
        pageNumber: 1,
        mimeType: "image/png",
        dataUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        widthPx: 100,
        heightPx: 100,
      },
    ]);
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
        filename: `${document.meta.title.replace(/[^\w-]+/g, "_") || "ordino"}.pdf`,
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
      filename: `${document.meta.title.replace(/[^\w-]+/g, "_") || "ordino"}.pdf`,
      blob: rendered.data.pdfBlob,
    });
  }
}

function passValidation(document: DocumentState): ValidationReport {
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

/**
 * Teammate C integration composition.
 * Uses B's `createAgent` with temporary A-side fakes until `src/document` / `src/pdf` land.
 */
export function composeAgent(options: ComposeAgentOptions): AgentPort {
  const document = new FakeDocumentPort();
  const pdf = new TemporaryPdfPort();

  const dependencies: AgentRuntimeDependencies = {
    document,
    pdf,
    validateDocument: passValidation,
    validatePdf: async (doc) => passValidation(doc),
    onEvent: options.onEvent,
  };

  return createAgent(
    dependencies,
    options.configuration ?? DEFAULT_GOOGLE_AI_CONFIGURATION,
  );
}

export function createSessionPdfPort(): PdfPort {
  return new TemporaryPdfPort();
}
