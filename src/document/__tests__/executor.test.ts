import { describe, expect, it } from "vitest";
import { createDocument } from "../create-document";
import { professionalDocumentFixture } from "../fixtures";
import { createDocumentPort } from "../index";
import { validateDocument } from "../validate-document";

const meta = professionalDocumentFixture.meta as any;

function addParagraph(port: any, doc: any, text: string) {
  return port.execute(doc, {
    type: "add_node",
    node: { type: "paragraph", text },
    position: { kind: "end" },
  });
}

describe("document executor", () => {
  it("add_node creates an id and increments version", async () => {
    const base = createDocument(meta);
    const port = createDocumentPort();
    const res = await port.execute(base, {
      type: "add_node",
      node: { type: "paragraph", text: "hello world" },
      position: { kind: "end" },
    });
    expect(res.success).toBe(true);
    const doc = res.success ? res.data.document : base;
    expect(doc.version).toBe(1);
    expect(doc.nodes.length).toBe(1);
  });

  it("add_node returns the nodeId in receipt", async () => {
    const base = createDocument(meta);
    const port = createDocumentPort();
    const res = await port.execute(base, {
      type: "add_node",
      node: { type: "paragraph", text: "test" },
      position: { kind: "end" },
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect((res.data.receipt as any).nodeId).toBeDefined();
      expect(typeof (res.data.receipt as any).nodeId).toBe("string");
    }
  });

  it("add_node with position before inserts correctly", async () => {
    const base = createDocument(meta);
    const port = createDocumentPort();
    const r1 = await addParagraph(port, base, "first");
    expect(r1.success).toBe(true);
    const doc1 = (r1 as any).data.document;

    const r2 = await port.execute(doc1, {
      type: "add_node",
      node: { type: "paragraph", text: "second" },
      position: { kind: "before", nodeId: doc1.nodes[0].id },
    });
    expect(r2.success).toBe(true);
    const doc2 = (r2 as any).data.document;
    expect(doc2.nodes[0].text).toBe("second");
    expect(doc2.nodes[1].text).toBe("first");
  });

  it("edit_node applies patch and increments version", async () => {
    const base = createDocument(meta);
    const port = createDocumentPort();
    const r1 = await addParagraph(port, base, "original");
    const doc1 = (r1 as any).data.document;
    const nodeId = doc1.nodes[0].id;

    const r2 = await port.execute(doc1, {
      type: "edit_node",
      nodeId,
      nodeType: "paragraph",
      patch: { text: "updated" },
    });
    expect(r2.success).toBe(true);
    const doc2 = (r2 as any).data.document;
    expect(doc2.version).toBe(2);
    expect(doc2.nodes[0].text).toBe("updated");
  });

  it("edit_node rejects type mismatch", async () => {
    const base = createDocument(meta);
    const port = createDocumentPort();
    const r1 = await addParagraph(port, base, "para");
    const doc1 = (r1 as any).data.document;
    const nodeId = doc1.nodes[0].id;

    const r2 = await port.execute(doc1, {
      type: "edit_node",
      nodeId,
      nodeType: "heading",
      patch: { text: "not a heading" },
    });
    expect(r2.success).toBe(false);
  });

  it("edit_node rejects empty patch", async () => {
    const base = createDocument(meta);
    const port = createDocumentPort();
    const r1 = await addParagraph(port, base, "para");
    const doc1 = (r1 as any).data.document;
    const nodeId = doc1.nodes[0].id;

    const r2 = await port.execute(doc1, {
      type: "edit_node",
      nodeId,
      nodeType: "paragraph",
      patch: {},
    });
    expect(r2.success).toBe(false);
  });

  it("delete_node removes node and increments version", async () => {
    const base = createDocument(meta);
    const port = createDocumentPort();
    const r1 = await addParagraph(port, base, "to delete");
    const doc1 = (r1 as any).data.document;
    const nodeId = doc1.nodes[0].id;

    const r2 = await port.execute(doc1, {
      type: "delete_node",
      nodeId,
    });
    expect(r2.success).toBe(true);
    const doc2 = (r2 as any).data.document;
    expect(doc2.nodes).toHaveLength(0);
    expect(doc2.version).toBe(2);
  });

  it("delete_node returns error for missing node", async () => {
    const base = createDocument(meta);
    const port = createDocumentPort();
    const res = await port.execute(base, {
      type: "delete_node",
      nodeId: "00000000-0000-0000-0000-000000000000",
    });
    expect(res.success).toBe(false);
    expect(base.version).toBe(0);
  });

  it("move_node rejects moving node before itself", async () => {
    const base = createDocument(meta);
    const port = createDocumentPort();
    const r1 = await addParagraph(port, base, "node");
    const doc1 = (r1 as any).data.document;
    const nodeId = doc1.nodes[0].id;

    const r2 = await port.execute(doc1, {
      type: "move_node",
      nodeId,
      position: { kind: "before", nodeId },
    });
    expect(r2.success).toBe(false);
  });

  it("move_node rejects moving node after itself", async () => {
    const base = createDocument(meta);
    const port = createDocumentPort();
    const r1 = await addParagraph(port, base, "node");
    const doc1 = (r1 as any).data.document;
    const nodeId = doc1.nodes[0].id;

    const r2 = await port.execute(doc1, {
      type: "move_node",
      nodeId,
      position: { kind: "after", nodeId },
    });
    expect(r2.success).toBe(false);
  });

  it("move_node correctly moves node to end", async () => {
    const base = createDocument(meta);
    const port = createDocumentPort();
    const r1 = await addParagraph(port, base, "first");
    const doc1 = (r1 as any).data.document;
    const r2 = await port.execute(doc1, {
      type: "add_node",
      node: { type: "paragraph", text: "second" },
      position: { kind: "end" },
    });
    const doc2 = (r2 as any).data.document;
    const firstId = doc2.nodes[0].id;

    const r3 = await port.execute(doc2, {
      type: "move_node",
      nodeId: firstId,
      position: { kind: "end" },
    });
    expect(r3.success).toBe(true);
    const doc3 = (r3 as any).data.document;
    expect(doc3.nodes[0].text).toBe("second");
    expect(doc3.nodes[1].text).toBe("first");
  });

  it("invalid add_node with table row mismatch returns error", async () => {
    const base = createDocument(meta);
    const port = createDocumentPort();
    const res = await port.execute(base, {
      type: "add_node",
      node: {
        type: "table",
        columns: [{ header: "A" }, { header: "B" }],
        rows: [["only-one-cell"]],
      },
      position: { kind: "end" },
    });
    expect(res.success).toBe(false);
  });

  it("every successful command increments version by exactly 1", async () => {
    const base = createDocument(meta);
    const port = createDocumentPort();
    let doc = base;

    for (let i = 0; i < 5; i++) {
      const res = await addParagraph(port, doc, `para ${i}`);
      expect(res.success).toBe(true);
      doc = (res as any).data.document;
      expect(doc.version).toBe(i + 1);
    }
  });

  it("invalid command does not increment version", async () => {
    const base = createDocument(meta);
    const port = createDocumentPort();
    const res = await port.execute(base, {
      type: "delete_node",
      nodeId: "00000000-0000-0000-0000-000000000000",
    });
    expect(res.success).toBe(false);
    expect(base.version).toBe(0);
  });
});

describe("outline", () => {
  it("produces deterministic previews", () => {
    const port = createDocumentPort();
    const doc = createDocument(meta);
    const outline1 = port.outline(doc);
    const outline2 = port.outline(doc);
    expect(outline1).toEqual(outline2);
  });

  it("truncates previews at 120 characters", async () => {
    const port = createDocumentPort();
    const base = createDocument(meta);
    const longText = "a".repeat(200);
    const res = await addParagraph(port, base, longText);
    const doc = (res as any).data.document;
    const outline = port.outline(doc);
    expect(outline[0].preview.length).toBeLessThanOrEqual(120);
  });

  it("includes zero-based index", async () => {
    const port = createDocumentPort();
    const base = createDocument(meta);
    await addParagraph(port, base, "first");
    const doc1 = ((await addParagraph(port, base, "first")) as any).data
      .document;
    const doc2 = (
      (await port.execute(doc1, {
        type: "add_node",
        node: { type: "paragraph", text: "second" },
        position: { kind: "end" },
      })) as any
    ).data.document;
    const outline = port.outline(doc2);
    expect(outline[0].index).toBe(0);
    expect(outline[1].index).toBe(1);
  });
});

describe("readNode", () => {
  it("returns the node with correct version", async () => {
    const port = createDocumentPort();
    const base = createDocument(meta);
    const res = await addParagraph(port, base, "hello");
    const doc = (res as any).data.document;
    const nodeId = doc.nodes[0].id;

    const readResult = port.readNode(doc, nodeId);
    expect(readResult.success).toBe(true);
    if (readResult.success) {
      expect(readResult.data.node.text).toBe("hello");
      expect(readResult.data.documentVersion).toBe(doc.version);
    }
  });

  it("returns error for missing node", () => {
    const port = createDocumentPort();
    const doc = createDocument(meta);
    const res = port.readNode(doc, "00000000-0000-0000-0000-000000000000");
    expect(res.success).toBe(false);
  });
});

describe("validation", () => {
  it("validates the fixture document", () => {
    const doc = professionalDocumentFixture as any;
    const report = validateDocument(doc);
    expect(report.pass).toBe(true);
  });

  it("reports leading page break", () => {
    const doc = createDocument(meta);
    doc.nodes = [
      { id: "00000000-0000-0000-0000-000000000001", type: "page_break" },
    ] as any;
    const report = validateDocument(doc);
    expect(report.issues.some((i) => i.code === "INVALID_PAGE_BREAK")).toBe(
      true,
    );
  });

  it("reports trailing page break", () => {
    const doc = createDocument(meta);
    doc.nodes = [
      {
        id: "00000000-0000-0000-0000-000000000001",
        type: "paragraph",
        text: "x",
      },
      { id: "00000000-0000-0000-0000-000000000002", type: "page_break" },
    ] as any;
    const report = validateDocument(doc);
    expect(report.issues.some((i) => i.code === "INVALID_PAGE_BREAK")).toBe(
      true,
    );
  });

  it("reports consecutive page breaks", () => {
    const doc = createDocument(meta);
    doc.nodes = [
      {
        id: "00000000-0000-0000-0000-000000000001",
        type: "paragraph",
        text: "x",
      },
      { id: "00000000-0000-0000-0000-000000000002", type: "page_break" },
      { id: "00000000-0000-0000-0000-000000000003", type: "page_break" },
    ] as any;
    const report = validateDocument(doc);
    expect(
      report.issues.some((i) => i.code === "CONSECUTIVE_PAGE_BREAKS"),
    ).toBe(true);
  });

  it("reports heading level jump", () => {
    const doc = createDocument(meta);
    doc.nodes = [
      {
        id: "00000000-0000-0000-0000-000000000001",
        type: "heading",
        level: 1,
        text: "H1",
        style: {},
      },
      {
        id: "00000000-0000-0000-0000-000000000002",
        type: "heading",
        level: 3,
        text: "H3",
        style: {},
      },
    ] as any;
    const report = validateDocument(doc);
    expect(report.issues.some((i) => i.code === "HEADING_LEVEL_JUMP")).toBe(
      true,
    );
  });

  it("reports trailing heading", () => {
    const doc = createDocument(meta);
    doc.nodes = [
      {
        id: "00000000-0000-0000-0000-000000000001",
        type: "heading",
        level: 1,
        text: "H1",
        style: {},
      },
    ] as any;
    const report = validateDocument(doc);
    expect(report.issues.some((i) => i.code === "TRAILING_HEADING")).toBe(true);
  });

  it("reports empty text node", () => {
    const doc = createDocument(meta);
    doc.nodes = [
      {
        id: "00000000-0000-0000-0000-000000000001",
        type: "paragraph",
        text: "   ",
        style: {},
      },
    ] as any;
    const report = validateDocument(doc);
    expect(report.issues.some((i) => i.code === "EMPTY_TEXT_NODE")).toBe(true);
  });

  it("reports empty table cells", () => {
    const doc = createDocument(meta);
    doc.nodes = [
      {
        id: "00000000-0000-0000-0000-000000000001",
        type: "table",
        columns: [{ header: "A", widthPercent: null }],
        rows: [[""]],
        style: {},
      },
    ] as any;
    const report = validateDocument(doc);
    expect(report.issues.some((i) => i.code === "EMPTY_TABLE_CELL")).toBe(true);
  });
});

describe("checkpoint", () => {
  it("user_turn does not increment reviewRevision", () => {
    const base = createDocument(meta);
    const port = createDocumentPort();
    const res = port.createCheckpoint(base, "user_turn");
    expect(res.success).toBe(true);
    const { document: continuation } = (res as any).data;
    expect(continuation.reviewRevision).toBe(base.reviewRevision);
  });

  it("review_revision increments reviewRevision", () => {
    const base = createDocument(meta);
    const port = createDocumentPort();
    const res = port.createCheckpoint(base, "review_revision");
    expect(res.success).toBe(true);
    const { document: continuation } = (res as any).data;
    expect(continuation.reviewRevision).toBe(base.reviewRevision + 1);
  });

  it("checkpoint document does not increment version", () => {
    const base = createDocument(meta);
    const port = createDocumentPort();
    const res = port.createCheckpoint(base, "user_turn");
    const { checkpoint } = (res as any).data;
    expect(checkpoint.document.version).toBe(base.version);
  });

  it("restoreCheckpoint produces isolated snapshot", () => {
    const base = createDocument(meta);
    const port = createDocumentPort();
    const cpRes = port.createCheckpoint(base, "user_turn");
    const { checkpoint } = (cpRes as any).data;
    const restored = port.restoreCheckpoint(checkpoint);
    expect(restored).not.toBe(base);
    expect(restored.documentId).toBe(base.documentId);
    expect(restored.version).toBe(base.version);
  });
});
