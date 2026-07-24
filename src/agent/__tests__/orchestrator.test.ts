import { describe, it, expect, vi } from "vitest";
import { createAgent } from "../index";
import { FakeDocumentPort, FakePdfPort } from "../fake-dependencies";
import type { AgentTurnInput, DocumentState, DocumentId } from "@/contracts";

describe("AgentOrchestrator acceptance tests", () => {
  const docPort = new FakeDocumentPort();
  const pdfPort = new FakePdfPort();

  const emptyDoc: DocumentState = {
    schemaVersion: 1,
    documentId: "doc-123" as DocumentId,
    version: 1,
    reviewRevision: 0,
    meta: {
      title: "Test Document",
      documentType: "Report",
      audience: "General",
      writingStyle: "professional",
      instructions: null,
      pageLimit: null,
    },
    nodes: [],
  };

  const input: AgentTurnInput = {
    userMessage: "Create a report on modern AI.",
    document: emptyDoc,
    conversation: [],
    referenceImages: [],
  };

  it("runs initial turn and creates nodes, renders, and performs review", async () => {
    // Mock fetch for server API routes
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/api/ai/generate")) {
        return {
          ok: true,
          json: async () => ({
            text: JSON.stringify({
              summary: "A brief plan",
              sections: [{ heading: "Intro", purpose: "Intro text", estimatedParagraphs: 1, includeTable: false, includeList: false }],
            }),
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    }));

    const events: any[] = [];
    const agent = createAgent(
      {
        document: docPort,
        pdf: pdfPort,
        validateDocument: () => ({ documentVersion: 1, pass: true, issues: [] }),
        validatePdf: async () => ({ documentVersion: 1, pass: true, issues: [] }),
        onEvent: (e) => events.push(e),
      },
      { provider: "google-ai-studio", modelId: "gemini-2.5-flash", transportRetries: 2 },
    );

    const result = await agent.runTurn(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.document.nodes.length).toBeGreaterThan(0);
      expect(result.data.finalRender).toBeDefined();
    }
    expect(events.map((e) => e.stage)).toContain("planning");
    expect(events.map((e) => e.stage)).toContain("generating");
    expect(events.map((e) => e.stage)).toContain("rendering");
    expect(events.map((e) => e.stage)).toContain("validating");
    expect(events.map((e) => e.stage)).toContain("rasterizing");
  });

  it("handles cancellation gracefully", async () => {
    const controller = new AbortController();
    controller.abort();

    const agent = createAgent(
      {
        document: docPort,
        pdf: pdfPort,
        validateDocument: () => ({ documentVersion: 1, pass: true, issues: [] }),
        validatePdf: async () => ({ documentVersion: 1, pass: true, issues: [] }),
        onEvent: () => {},
      },
      { provider: "google-ai-studio", modelId: "gemini-2.5-flash", transportRetries: 2 },
    );

    const result = await agent.runTurn({ ...input, signal: controller.signal });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("ABORTED");
      expect((result.error as any).recovery).toBeDefined();
    }
  });
});
