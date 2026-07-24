import {
  type DocumentState,
  type DocumentPort,
  type PdfPort,
  type InternalRenderResult,
  type RasterizedPage,
  type ExportResult,
  type ValidationReport,
  type CheckpointCreation,
  type CommandExecution,
  type ReadNodeReceipt,
  type DocumentCommand,
  type NodeId,
  type DocumentCheckpoint,
  documentStateSchema,
  checkpointIdSchema,
} from "@/contracts";
import { createSuccessResult, createErrorResult } from "@/google-ai";

export class FakeDocumentPort implements DocumentPort {
  execute(
    document: DocumentState,
    command: DocumentCommand,
  ): ReturnType<DocumentPort["execute"]> {
    let nextNodes = [...document.nodes];
    if (command.type === "add_node") {
      const newNode = {
        id: `node-${document.nodes.length + 1}` as NodeId,
        type: command.node.type,
        ...(command.node as any),
      };
      nextNodes.push(newNode);
    }
    const nextDoc: DocumentState = {
      ...document,
      nodes: nextNodes,
      version: document.version + 1,
    };

    return createSuccessResult({
      document: nextDoc,
      receipt: {
        documentVersion: nextDoc.version,
        outline: this.outline(nextDoc),
        changeSet: {
          fromVersion: document.version,
          toVersion: nextDoc.version,
          addedNodeIds: command.type === "add_node" ? ["node-1" as NodeId] : [],
          updatedNodeIds: command.type === "edit_node" ? [command.nodeId] : [],
          movedNodeIds: command.type === "move_node" ? [command.nodeId] : [],
          deletedNodeIds: command.type === "delete_node" ? [command.nodeId] : [],
          affectsPagination: true,
        },
      },
    });
  }

  outline(document: DocumentState): ReturnType<DocumentPort["outline"]> {
    return document.nodes.map((node, index) => ({
      id: node.id,
      index,
      type: node.type,
      preview: "text" in node ? String(node.text).slice(0, 120) : node.type,
    }));
  }

  readNode(
    document: DocumentState,
    nodeId: NodeId,
  ): ReturnType<DocumentPort["readNode"]> {
    const node = document.nodes.find((n) => n.id === nodeId);
    if (!node) {
      return createErrorResult("NODE_NOT_FOUND", `Node ${nodeId} not found`);
    }
    return createSuccessResult({
      documentVersion: document.version,
      node,
    });
  }

  createCheckpoint(
    document: DocumentState,
    reason: "user_turn" | "review_revision",
  ): ReturnType<DocumentPort["createCheckpoint"]> {
    const checkpoint: DocumentCheckpoint = {
      id: checkpointIdSchema.parse(crypto.randomUUID()),
      reason,
      document,
      createdAt: new Date().toISOString(),
    };
    const nextDocument: DocumentState =
      reason === "review_revision"
        ? { ...document, reviewRevision: document.reviewRevision + 1 }
        : document;

    return createSuccessResult({
      checkpoint,
      document: nextDocument,
    });
  }

  restoreCheckpoint(checkpoint: DocumentCheckpoint): DocumentState {
    return checkpoint.document;
  }
}

export class FakePdfPort implements PdfPort {
  async render(
    document: DocumentState,
    signal?: AbortSignal,
  ): Promise<ReturnType<PdfPort["render"]>> {
    return createSuccessResult({
      documentId: document.documentId,
      documentVersion: document.version,
      pdfBlob: new Blob(["fake-pdf"], { type: "application/pdf" }),
      pageCount: 1,
      renderedAt: new Date().toISOString(),
    });
  }

  async rasterize(
    render: InternalRenderResult,
    signal?: AbortSignal,
  ): Promise<ReturnType<PdfPort["rasterize"]>> {
    return createSuccessResult([
      {
        documentVersion: render.documentVersion,
        pageNumber: 1,
        mimeType: "image/png",
        dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSAhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        widthPx: 100,
        heightPx: 100,
      },
    ]);
  }

  async export(
    document: DocumentState,
    existingRender?: InternalRenderResult,
    signal?: AbortSignal,
  ): Promise<ReturnType<PdfPort["export"]>> {
    return createSuccessResult({
      documentId: document.documentId,
      documentVersion: document.version,
      filename: `${document.meta.title}.pdf`,
      blob: existingRender?.pdfBlob ?? new Blob(["fake-pdf"], { type: "application/pdf" }),
    });
  }
}
