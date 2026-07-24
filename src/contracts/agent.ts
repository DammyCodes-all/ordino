import { z } from "zod";
import type { DocumentPort } from "./commands";
import {
  type DocumentState,
  documentCheckpointSchema,
  documentStateSchema,
} from "./document";
import type { GoogleAIConfiguration } from "./google-ai";
import { conversationMessageSchema, referenceImageSchema } from "./persistence";
import {
  exportResultSchema,
  type InternalRenderResult,
  internalRenderResultSchema,
  type PdfPort,
} from "./rendering";
import { type AppResult, appErrorSchema } from "./result";
import { visualReviewResultSchema } from "./review";
import { type ValidationReport, validationReportSchema } from "./validation";
import type { ToolCallEvent, WorkflowEvent } from "./workflow";

export const agentTurnInputDataSchema = z
  .object({
    userMessage: z.string().trim().min(1).max(20_000),
    document: documentStateSchema,
    conversation: z.array(conversationMessageSchema),
    referenceImages: z.array(referenceImageSchema),
  })
  .strict();

export type AgentTurnInputData = z.infer<typeof agentTurnInputDataSchema>;

export interface AgentTurnInput extends AgentTurnInputData {
  signal?: AbortSignal;
}

export const agentTurnOutputSchema = z
  .object({
    document: documentStateSchema,
    createdCheckpoints: z.array(documentCheckpointSchema),
    finalRender: internalRenderResultSchema,
    exportResult: exportResultSchema.nullable(),
    validation: validationReportSchema,
    visualReview: visualReviewResultSchema.nullable(),
    reviewIterations: z.union([
      z.literal(0),
      z.literal(1),
    ]),
    assistantMessage: z.string().trim().min(1).max(20_000),
  })
  .strict();

export const agentTurnRecoverySchema = z
  .object({
    document: documentStateSchema,
    createdCheckpoints: z.array(documentCheckpointSchema),
    lastValidRender: internalRenderResultSchema.nullable(),
  })
  .strict();

export const agentTurnErrorSchema = appErrorSchema
  .extend({ recovery: agentTurnRecoverySchema })
  .strict();

export type AgentTurnOutput = z.infer<typeof agentTurnOutputSchema>;
export type AgentTurnRecovery = z.infer<typeof agentTurnRecoverySchema>;
export type AgentTurnError = z.infer<typeof agentTurnErrorSchema>;

export interface AgentRuntimeDependencies {
  document: DocumentPort;
  pdf: PdfPort;
  validateDocument(document: DocumentState): ValidationReport;
  validatePdf(
    document: DocumentState,
    render: InternalRenderResult,
  ): Promise<ValidationReport>;
  onEvent(event: WorkflowEvent): void;
  onThinking?(text: string): void;
  onToolCall?(event: ToolCallEvent): void;
}

export interface AgentPort {
  runTurn(
    input: AgentTurnInput,
  ): Promise<AppResult<AgentTurnOutput, AgentTurnError>>;
}

export type CreateAgent = (
  dependencies: AgentRuntimeDependencies,
  configuration: GoogleAIConfiguration,
) => AgentPort;
