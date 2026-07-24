import { z } from "zod";

const brandedUuid = <T extends string>(brand: T) =>
  z.string().uuid().brand<T>();

export const documentIdSchema = brandedUuid("DocumentId");
export const nodeIdSchema = brandedUuid("NodeId");
export const referenceImageIdSchema = brandedUuid("ReferenceImageId");
export const checkpointIdSchema = brandedUuid("CheckpointId");
export const messageIdSchema = brandedUuid("MessageId");

export type DocumentId = z.infer<typeof documentIdSchema>;
export type NodeId = z.infer<typeof nodeIdSchema>;
export type ReferenceImageId = z.infer<typeof referenceImageIdSchema>;
export type CheckpointId = z.infer<typeof checkpointIdSchema>;
export type MessageId = z.infer<typeof messageIdSchema>;
