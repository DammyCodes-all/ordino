import { z } from "zod";
import {
  editNodeCommandSchema,
  newDocumentNodeSchema,
  nodeIdSchema,
  nodePositionSchema,
} from "@/contracts";

export const addNodeToolSchema = z.object({
  node: newDocumentNodeSchema,
  position: nodePositionSchema,
});

export const editNodeToolSchema = editNodeCommandSchema;

export const moveNodeToolSchema = z.object({
  nodeId: nodeIdSchema,
  position: nodePositionSchema,
});

export const deleteNodeToolSchema = z.object({
  nodeId: nodeIdSchema,
});

export const readNodeToolSchema = z.object({
  nodeId: nodeIdSchema,
});

export const finalizeDocumentToolSchema = z.object({});

export type AddNodeToolInput = z.infer<typeof addNodeToolSchema>;
export type EditNodeToolInput = z.infer<typeof editNodeToolSchema>;
export type MoveNodeToolInput = z.infer<typeof moveNodeToolSchema>;
export type DeleteNodeToolInput = z.infer<typeof deleteNodeToolSchema>;
export type ReadNodeToolInput = z.infer<typeof readNodeToolSchema>;
export type FinalizeDocumentToolInput = z.infer<
  typeof finalizeDocumentToolSchema
>;
