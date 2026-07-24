import { z } from "zod";

export const workflowStageSchema = z.enum([
  "idle",
  "planning",
  "generating",
  "rendering",
  "validating",
  "rasterizing",
  "reviewing",
  "revising",
  "finalizing",
  "ready",
  "failed",
  "cancelled",
]);

export const toolCallEventSchema = z
  .object({
    action: z.string(),
    nodeId: z.string().optional(),
    label: z.string().optional(),
    documentVersion: z.number(),
  })
  .strict();

export const workflowEventSchema = z
  .object({
    stage: workflowStageSchema,
    message: z.string().min(1).max(300),
    level: z.enum(["info", "success", "warning", "error"]),
    createdAt: z.string().datetime(),
    toolCall: toolCallEventSchema.optional(),
  })
  .strict();

export const agentTurnStateSchema = z
  .object({
    running: z.boolean(),
    stage: workflowStageSchema,
    reviewIteration: z.union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
    ]),
  })
  .strict();

export type WorkflowStage = z.infer<typeof workflowStageSchema>;
export type ToolCallEvent = z.infer<typeof toolCallEventSchema>;
export type WorkflowEvent = z.infer<typeof workflowEventSchema>;
export type AgentTurnState = z.infer<typeof agentTurnStateSchema>;
