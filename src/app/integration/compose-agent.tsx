"use client";

import { createAgent } from "@/agent";
import { createApiPdfPort } from "@/app/integration/api-pdf-port";
import type {
  AgentPort,
  AgentRuntimeDependencies,
  GoogleAIConfiguration,
  PdfPort,
  WorkflowEvent,
} from "@/contracts";
import { DEFAULT_GOOGLE_AI_CONFIGURATION } from "@/contracts";
import { createDocumentPort, validateDocument } from "@/document";

function passPdfValidation(documentVersion: number) {
  return {
    documentVersion,
    pass: true,
    issues: [],
  };
}

export type ComposeAgentOptions = {
  onEvent: (event: WorkflowEvent) => void;
  configuration?: GoogleAIConfiguration;
};

/** Compose B's agent with A's document port + API-backed PDF port. */
export function composeAgent(options: ComposeAgentOptions): AgentPort {
  const document = createDocumentPort();
  const pdfPort = createApiPdfPort();

  const dependencies: AgentRuntimeDependencies = {
    document,
    pdf: pdfPort,
    validateDocument,
    validatePdf: async (doc) => passPdfValidation(doc.version),
    onEvent: options.onEvent,
  };

  return createAgent(
    dependencies,
    options.configuration ?? DEFAULT_GOOGLE_AI_CONFIGURATION,
  );
}

export function createSessionPdfPort(): PdfPort {
  return createApiPdfPort();
}

export function createSessionDocumentPort() {
  return createDocumentPort();
}
