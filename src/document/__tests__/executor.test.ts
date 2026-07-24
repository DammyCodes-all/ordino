import { describe, it, expect } from "vitest";
import { createDocument } from "../create-document";
import { createDocumentPort } from "../index";
import { professionalDocumentFixture } from "../fixtures";

describe("document executor basic behaviors", () => {
  it("add_node creates an id and increments version", async () => {
    const base = createDocument(professionalDocumentFixture.meta as any);
    const port = createDocumentPort();
    const command = {
      type: "add_node",
      node: { type: "paragraph", text: "hello world" },
      position: { kind: "end" },
    } as any;

    const res = await port.execute(base as any, command as any);
    expect(res.success).toBe(true);
    const doc = res.success ? res.data.document : base;
    expect(doc.version).toBe(1);
    expect(doc.nodes.length).toBeGreaterThan(0);
  });

  it("invalid delete returns error and leaves document unchanged", async () => {
    const base = createDocument(professionalDocumentFixture.meta as any);
    const port = createDocumentPort();
    const res = await port.execute(
      base as any,
      {
        type: "delete_node",
        nodeId: "00000000-0000-0000-0000-000000000000",
      } as any,
    );
    expect(res.success).toBe(false);
    expect(base.version).toBe(0);
  });

  it("checkpoint creates an isolated snapshot and review revision increments appropriately", () => {
    const base = createDocument(professionalDocumentFixture.meta as any);
    const port = createDocumentPort();
    const cpRes = port.createCheckpoint(base as any, "review_revision");
    expect(cpRes.success).toBe(true);
    const { checkpoint, document: continuation } = (cpRes as any).data;
    expect(checkpoint.document.documentId).toBe(base.documentId);
    expect(continuation.reviewRevision).toBe(base.reviewRevision + 1);
    // restore should give isolated snapshot
    const restored = port.restoreCheckpoint(checkpoint as any);
    expect(restored).not.toBe(base);
    expect(restored.documentId).toBe(base.documentId);
  });
});
