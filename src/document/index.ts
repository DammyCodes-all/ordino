export { createDocument } from "./create-document";
import {
  documentStateSchema,
  DocumentState,
  DocumentCheckpoint,
} from "../contracts/document";
import {
  createOutline,
  executeCommand,
  createCheckpoint as createCheckpointImpl,
  restoreCheckpoint as restoreCheckpointImpl,
} from "./command-executor";
import { validateDocument as validateDocumentImpl } from "./validate-document";

export function createDocumentPort() {
  return {
    execute(document: DocumentState, command: any) {
      return executeCommand(document, command);
    },
    outline(document: DocumentState) {
      return createOutline(document);
    },
    readNode(document: DocumentState, nodeId: string) {
      const node = document.nodes.find((n) => n.id === nodeId);
      if (!node)
        return {
          success: false,
          error: {
            code: "NODE_NOT_FOUND",
            message: "Node not found",
            retryable: false,
          },
        } as any;
      return {
        success: true,
        data: { documentVersion: document.version, node },
      } as any;
    },
    createCheckpoint(
      document: DocumentState,
      reason: "user_turn" | "review_revision",
    ) {
      return createCheckpointImpl(document, reason);
    },
    restoreCheckpoint(checkpoint: DocumentCheckpoint) {
      return restoreCheckpointImpl(checkpoint);
    },
  };
}

export function validateDocument(document: DocumentState) {
  return validateDocumentImpl(document);
}

// Intentionally export only the named API: createDocument, createDocumentPort, validateDocument
