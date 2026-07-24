import type {
  DocumentPort,
  DocumentState,
  AppResult,
  AddNodeReceipt,
  MutationReceipt,
  ReadNodeReceipt,
  FinalizeReceipt,
} from "@/contracts";
import { createSuccessResult } from "@/google-ai";
import type {
  AddNodeToolInput,
  EditNodeToolInput,
  MoveNodeToolInput,
  DeleteNodeToolInput,
  ReadNodeToolInput,
} from "./tool-definitions";

export class ToolExecutor {
  constructor(private documentPort: DocumentPort) {}

  addNode(
    doc: DocumentState,
    input: AddNodeToolInput,
  ): { result: AppResult<AddNodeReceipt>; updatedDoc: DocumentState } {
    const res = this.documentPort.execute(doc, {
      type: "add_node",
      node: input.node,
      position: input.position,
    });

    if (res.success) {
      return {
        result: createSuccessResult(res.data.receipt as AddNodeReceipt),
        updatedDoc: res.data.document,
      };
    }
    return { result: res, updatedDoc: doc };
  }

  editNode(
    doc: DocumentState,
    input: EditNodeToolInput,
  ): { result: AppResult<MutationReceipt>; updatedDoc: DocumentState } {
    const res = this.documentPort.execute(doc, input);

    if (res.success) {
      return {
        result: createSuccessResult(res.data.receipt),
        updatedDoc: res.data.document,
      };
    }
    return { result: res, updatedDoc: doc };
  }

  moveNode(
    doc: DocumentState,
    input: MoveNodeToolInput,
  ): { result: AppResult<MutationReceipt>; updatedDoc: DocumentState } {
    const res = this.documentPort.execute(doc, {
      type: "move_node",
      nodeId: input.nodeId,
      position: input.position,
    });

    if (res.success) {
      return {
        result: createSuccessResult(res.data.receipt),
        updatedDoc: res.data.document,
      };
    }
    return { result: res, updatedDoc: doc };
  }

  deleteNode(
    doc: DocumentState,
    input: DeleteNodeToolInput,
  ): { result: AppResult<MutationReceipt>; updatedDoc: DocumentState } {
    const res = this.documentPort.execute(doc, {
      type: "delete_node",
      nodeId: input.nodeId,
    });

    if (res.success) {
      return {
        result: createSuccessResult(res.data.receipt),
        updatedDoc: res.data.document,
      };
    }
    return { result: res, updatedDoc: doc };
  }

  readNode(
    doc: DocumentState,
    input: ReadNodeToolInput,
  ): { result: AppResult<ReadNodeReceipt>; updatedDoc: DocumentState } {
    const res = this.documentPort.readNode(doc, input.nodeId);
    return { result: res, updatedDoc: doc };
  }

  finalizeDocument(
    doc: DocumentState,
  ): { result: AppResult<FinalizeReceipt>; updatedDoc: DocumentState } {
    return {
      result: createSuccessResult({
        finalized: true,
        documentVersion: doc.version,
      }),
      updatedDoc: doc,
    };
  }
}
