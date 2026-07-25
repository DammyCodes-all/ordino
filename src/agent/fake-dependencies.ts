import {
  type CheckpointCreation,
  type CommandExecution,
  checkpointIdSchema,
  type DocumentCheckpoint,
  type DocumentCommand,
  type DocumentPort,
  type DocumentState,
  documentStateSchema,
  type ExportResult,
  type InternalRenderResult,
  type NodeId,
  type PdfPort,
  type RasterizedPage,
  type ReadNodeReceipt,
  type ValidationReport,
} from "@/contracts";
import { createErrorResult, createSuccessResult } from "@/google-ai";

export class FakeDocumentPort implements DocumentPort {
  private nodeCounter = 0;

  execute(
    document: DocumentState,
    command: DocumentCommand,
  ): ReturnType<DocumentPort["execute"]> {
    let nextNodes = [...document.nodes];
    let addedNodeIds: NodeId[] = [];
    let updatedNodeIds: NodeId[] = [];
    let movedNodeIds: NodeId[] = [];
    let deletedNodeIds: NodeId[] = [];

    if (command.type === "add_node") {
      this.nodeCounter++;
      const nodeId = `node-${this.nodeCounter}` as NodeId;
      const newNode = {
        id: nodeId,
        type: command.node.type,
        ...(command.node as any),
      };
      nextNodes.push(newNode);
      addedNodeIds = [nodeId];
    } else if (command.type === "delete_node") {
      nextNodes = nextNodes.filter((n) => n.id !== command.nodeId);
      deletedNodeIds = [command.nodeId];
    } else if (command.type === "move_node") {
      const idx = nextNodes.findIndex((n) => n.id === command.nodeId);
      if (idx !== -1) {
        const [node] = nextNodes.splice(idx, 1);
        if (command.position.kind === "end") {
          nextNodes.push(node);
        } else {
          const targetIdx = nextNodes.findIndex(
            (n) => n.id === (command.position as any).nodeId,
          );
          const insertAt =
            targetIdx === -1
              ? nextNodes.length
              : command.position.kind === "before"
                ? targetIdx
                : targetIdx + 1;
          nextNodes.splice(insertAt, 0, node);
        }
      }
      movedNodeIds = [command.nodeId];
    } else if (command.type === "edit_node") {
      const idx = nextNodes.findIndex((n) => n.id === command.nodeId);
      if (idx !== -1) {
        nextNodes[idx] = { ...nextNodes[idx], ...(command.patch as any) };
      }
      updatedNodeIds = [command.nodeId];
    }

    const nextDoc: DocumentState = {
      ...document,
      nodes: nextNodes,
      version: document.version + 1,
    };

    const baseReceipt: any = {
      documentVersion: nextDoc.version,
      outline: this.outline(nextDoc),
      changeSet: {
        fromVersion: document.version,
        toVersion: nextDoc.version,
        addedNodeIds,
        updatedNodeIds,
        movedNodeIds,
        deletedNodeIds,
        affectsPagination:
          command.type !== "edit_node" ||
          Object.keys((command as any).patch || {}).some((f: string) =>
            [
              "text",
              "level",
              "items",
              "columns",
              "rows",
              "ordered",
              "title",
            ].includes(f),
          ),
      },
    };

    if (command.type === "add_node") {
      baseReceipt.nodeId = addedNodeIds[0];
    }

    return createSuccessResult({
      document: nextDoc,
      receipt: baseReceipt,
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
  ): ReturnType<PdfPort["render"]> {
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
  ): ReturnType<PdfPort["rasterize"]> {
    return createSuccessResult([
      {
        documentVersion: render.documentVersion,
        pageNumber: 1,
        mimeType: "image/png",
        dataUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSAhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
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
    return createSuccessResult({
      documentId: document.documentId,
      documentVersion: document.version,
      filename: `${document.meta.title}.pdf`,
      blob:
        existingRender?.pdfBlob ??
        new Blob(["fake-pdf"], { type: "application/pdf" }),
    });
  }
}
