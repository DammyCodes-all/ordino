import { describe, expect, it } from "vitest";
import {
  documentStateSchema,
  editNodeCommandSchema,
  googleAIConfigurationSchema,
  newDocumentNodeSchema,
  persistedSessionSchema,
} from "./index";

const documentId = "d9428888-122b-4e1f-b85c-61fdd91e8eaa";
const nodeId = "9f4b643e-2851-4f9b-8f6f-87e9491c21bc";

const meta = {
  title: "Project Proposal",
  documentType: "Business Proposal",
  audience: "Review committee",
  writingStyle: "professional" as const,
  instructions: null,
  pageLimit: null,
};

describe("shared contracts", () => {
  it("accepts canonical document state", () => {
    const result = documentStateSchema.safeParse({
      schemaVersion: 1,
      documentId,
      version: 0,
      reviewRevision: 0,
      meta,
      nodes: [],
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty edit patches", () => {
    const result = editNodeCommandSchema.safeParse({
      type: "edit_node",
      nodeId,
      nodeType: "paragraph",
      patch: {},
    });

    expect(result.success).toBe(false);
  });

  it("rejects table rows that do not match the column count", () => {
    const result = newDocumentNodeSchema.safeParse({
      type: "table",
      columns: [
        { header: "Item", widthPercent: 50 },
        { header: "Cost", widthPercent: 50 },
      ],
      rows: [["Laptop"]],
    });

    expect(result.success).toBe(false);
  });

  it("requires Google AI Studio configuration", () => {
    const result = googleAIConfigurationSchema.safeParse({
      provider: "google-ai-studio",
      modelId: "gemini-2.5-flash",
      transportRetries: 2,
    });

    expect(result.success).toBe(true);
  });

  it("does not accept persisted PDF artifacts", () => {
    const result = persistedSessionSchema.safeParse({
      schemaVersion: 1,
      document: {
        schemaVersion: 1,
        documentId,
        version: 0,
        reviewRevision: 0,
        meta,
        nodes: [],
      },
      messages: [],
      referenceImages: [],
      checkpoints: [],
      savedAt: new Date().toISOString(),
      pdfBlob: new Blob(),
    });

    expect(result.success).toBe(false);
  });
});
