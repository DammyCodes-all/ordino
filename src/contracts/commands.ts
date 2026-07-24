import { z } from "zod";
import {
  calloutStyleSchema,
  type DocumentCheckpoint,
  type DocumentState,
  dividerStyleSchema,
  documentCheckpointSchema,
  documentNodeSchema,
  documentStateSchema,
  headingStyleSchema,
  listStyleSchema,
  paragraphStyleSchema,
  quoteStyleSchema,
  tableColumnSchema,
  tableStyleSchema,
} from "./document";
import { nodeIdSchema } from "./ids";
import { documentOutlineSchema } from "./outline";
import type { AppResult } from "./result";

export const nodePositionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("end") }).strict(),
  z.object({ kind: z.literal("before"), nodeId: nodeIdSchema }).strict(),
  z.object({ kind: z.literal("after"), nodeId: nodeIdSchema }).strict(),
]);

const newHeadingNodeSchema = z
  .object({
    type: z.literal("heading"),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    text: z.string().trim().min(1).max(200),
    style: headingStyleSchema.partial().optional(),
  })
  .strict();

const newParagraphNodeSchema = z
  .object({
    type: z.literal("paragraph"),
    text: z.string().trim().min(1).max(8_000),
    style: paragraphStyleSchema.partial().optional(),
  })
  .strict();

const newListNodeSchema = z
  .object({
    type: z.literal("list"),
    ordered: z.boolean(),
    items: z.array(z.string().trim().min(1).max(1_000)).min(1).max(20),
    style: listStyleSchema.partial().optional(),
  })
  .strict();

const newTableNodeSchema = z
  .object({
    type: z.literal("table"),
    columns: z.array(tableColumnSchema).min(1).max(6),
    rows: z.array(z.array(z.string().trim().min(1).max(2_000))).max(20),
    style: tableStyleSchema.partial().optional(),
  })
  .strict()
  .superRefine((table, context) => {
    for (const [rowIndex, row] of table.rows.entries()) {
      if (row.length !== table.columns.length) {
        context.addIssue({
          code: "custom",
          message: "Each table row must match the column count.",
          path: ["rows", rowIndex],
        });
      }
    }

    const widths = table.columns.map((column) => column.widthPercent);
    const specified = widths.filter((width) => width !== null);
    if (specified.length !== 0 && specified.length !== widths.length) {
      context.addIssue({
        code: "custom",
        message: "Table widths must be either all specified or all null.",
        path: ["columns"],
      });
    }
    if (
      specified.length === widths.length &&
      Math.abs(specified.reduce((sum, width) => sum + width, 0) - 100) > 0.01
    ) {
      context.addIssue({
        code: "custom",
        message: "Specified table widths must total 100 percent.",
        path: ["columns"],
      });
    }
  });

const newQuoteNodeSchema = z
  .object({
    type: z.literal("quote"),
    text: z.string().trim().min(1).max(4_000),
    attribution: z.string().trim().min(1).max(300).nullable(),
    style: quoteStyleSchema.partial().optional(),
  })
  .strict();

const newCalloutNodeSchema = z
  .object({
    type: z.literal("callout"),
    title: z.string().trim().min(1).max(200).nullable(),
    text: z.string().trim().min(1).max(4_000),
    style: calloutStyleSchema.partial().optional(),
  })
  .strict();

const newDividerNodeSchema = z
  .object({
    type: z.literal("divider"),
    style: dividerStyleSchema.partial().optional(),
  })
  .strict();

const newPageBreakNodeSchema = z
  .object({ type: z.literal("page_break") })
  .strict();

export const newDocumentNodeSchema = z.discriminatedUnion("type", [
  newHeadingNodeSchema,
  newParagraphNodeSchema,
  newListNodeSchema,
  newTableNodeSchema,
  newQuoteNodeSchema,
  newCalloutNodeSchema,
  newDividerNodeSchema,
  newPageBreakNodeSchema,
]);

export const addNodeCommandSchema = z
  .object({
    type: z.literal("add_node"),
    node: newDocumentNodeSchema,
    position: nodePositionSchema,
  })
  .strict();

export const moveNodeCommandSchema = z
  .object({
    type: z.literal("move_node"),
    nodeId: nodeIdSchema,
    position: nodePositionSchema,
  })
  .strict();

export const deleteNodeCommandSchema = z
  .object({ type: z.literal("delete_node"), nodeId: nodeIdSchema })
  .strict();

export const editMetaCommandSchema = z
  .object({
    type: z.literal("edit_meta"),
    patch: z
      .object({
        title: z.string().trim().min(1).max(200).optional(),
      })
      .strict()
      .refine((patch) => Object.keys(patch).length > 0, {
        message: "An edit_meta patch must contain at least one field.",
      }),
  })
  .strict();

const nonEmptyPatch = <T extends z.ZodRawShape>(shape: T) =>
  z
    .object(shape)
    .strict()
    .refine((patch) => Object.keys(patch).length > 0, {
      message: "An edit patch must contain at least one field.",
    });

const editHeadingCommandSchema = z
  .object({
    type: z.literal("edit_node"),
    nodeId: nodeIdSchema,
    nodeType: z.literal("heading"),
    patch: nonEmptyPatch({
      text: z.string().trim().min(1).max(200).optional(),
      level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
      style: headingStyleSchema.partial().optional(),
    }),
  })
  .strict();

const editParagraphCommandSchema = z
  .object({
    type: z.literal("edit_node"),
    nodeId: nodeIdSchema,
    nodeType: z.literal("paragraph"),
    patch: nonEmptyPatch({
      text: z.string().trim().min(1).max(8_000).optional(),
      style: paragraphStyleSchema.partial().optional(),
    }),
  })
  .strict();

const editListCommandSchema = z
  .object({
    type: z.literal("edit_node"),
    nodeId: nodeIdSchema,
    nodeType: z.literal("list"),
    patch: nonEmptyPatch({
      ordered: z.boolean().optional(),
      items: z
        .array(z.string().trim().min(1).max(1_000))
        .min(1)
        .max(20)
        .optional(),
      style: listStyleSchema.partial().optional(),
    }),
  })
  .strict();

const editTableCommandSchema = z
  .object({
    type: z.literal("edit_node"),
    nodeId: nodeIdSchema,
    nodeType: z.literal("table"),
    patch: nonEmptyPatch({
      columns: z.array(tableColumnSchema).min(1).max(6).optional(),
      rows: z
        .array(z.array(z.string().trim().min(1).max(2_000)))
        .max(20)
        .optional(),
      style: tableStyleSchema.partial().optional(),
    }),
  })
  .strict();

const editQuoteCommandSchema = z
  .object({
    type: z.literal("edit_node"),
    nodeId: nodeIdSchema,
    nodeType: z.literal("quote"),
    patch: nonEmptyPatch({
      text: z.string().trim().min(1).max(4_000).optional(),
      attribution: z.string().trim().min(1).max(300).nullable().optional(),
      style: quoteStyleSchema.partial().optional(),
    }),
  })
  .strict();

const editCalloutCommandSchema = z
  .object({
    type: z.literal("edit_node"),
    nodeId: nodeIdSchema,
    nodeType: z.literal("callout"),
    patch: nonEmptyPatch({
      title: z.string().trim().min(1).max(200).nullable().optional(),
      text: z.string().trim().min(1).max(4_000).optional(),
      style: calloutStyleSchema.partial().optional(),
    }),
  })
  .strict();

const editDividerCommandSchema = z
  .object({
    type: z.literal("edit_node"),
    nodeId: nodeIdSchema,
    nodeType: z.literal("divider"),
    patch: nonEmptyPatch({ style: dividerStyleSchema.partial().optional() }),
  })
  .strict();

export const editNodeCommandSchema = z.discriminatedUnion("nodeType", [
  editHeadingCommandSchema,
  editParagraphCommandSchema,
  editListCommandSchema,
  editTableCommandSchema,
  editQuoteCommandSchema,
  editCalloutCommandSchema,
  editDividerCommandSchema,
]);

export const documentCommandSchema = z.union([
  addNodeCommandSchema,
  editNodeCommandSchema,
  moveNodeCommandSchema,
  deleteNodeCommandSchema,
  editMetaCommandSchema,
]);

export const documentChangeSetSchema = z
  .object({
    fromVersion: z.number().int().nonnegative(),
    toVersion: z.number().int().positive(),
    addedNodeIds: z.array(nodeIdSchema),
    updatedNodeIds: z.array(nodeIdSchema),
    movedNodeIds: z.array(nodeIdSchema),
    deletedNodeIds: z.array(nodeIdSchema),
    affectsPagination: z.boolean(),
  })
  .strict();

export const mutationReceiptSchema = z
  .object({
    documentVersion: z.number().int().nonnegative(),
    outline: documentOutlineSchema,
    changeSet: documentChangeSetSchema,
  })
  .strict();

export const addNodeReceiptSchema = mutationReceiptSchema
  .extend({ nodeId: nodeIdSchema })
  .strict();

export const readNodeReceiptSchema = z
  .object({
    documentVersion: z.number().int().nonnegative(),
    node: documentNodeSchema,
  })
  .strict();

export type ReadNodeReceipt = z.infer<typeof readNodeReceiptSchema>;

export const finalizeReceiptSchema = z
  .object({
    finalized: z.literal(true),
    documentVersion: z.number().int().nonnegative(),
  })
  .strict();

export const commandExecutionSchema = z
  .object({
    document: documentStateSchema,
    receipt: z.union([mutationReceiptSchema, addNodeReceiptSchema]),
  })
  .strict();

export const checkpointCreationSchema = z
  .object({
    checkpoint: documentCheckpointSchema,
    document: documentStateSchema,
  })
  .strict();

export type NodePosition = z.infer<typeof nodePositionSchema>;
export type NewDocumentNode = z.infer<typeof newDocumentNodeSchema>;
export type AddNodeCommand = z.infer<typeof addNodeCommandSchema>;
export type EditNodeCommand = z.infer<typeof editNodeCommandSchema>;
export type MoveNodeCommand = z.infer<typeof moveNodeCommandSchema>;
export type DeleteNodeCommand = z.infer<typeof deleteNodeCommandSchema>;
export type EditMetaCommand = z.infer<typeof editMetaCommandSchema>;
export type DocumentCommand = z.infer<typeof documentCommandSchema>;
export type DocumentChangeSet = z.infer<typeof documentChangeSetSchema>;
export type MutationReceipt = z.infer<typeof mutationReceiptSchema>;
export type AddNodeReceipt = z.infer<typeof addNodeReceiptSchema>;
export type FinalizeReceipt = z.infer<typeof finalizeReceiptSchema>;
export type CommandExecution = z.infer<typeof commandExecutionSchema>;
export type CheckpointCreation = z.infer<typeof checkpointCreationSchema>;

export interface DocumentPort {
  execute(
    document: DocumentState,
    command: DocumentCommand,
  ): AppResult<CommandExecution>;
  outline(document: DocumentState): import("./outline").DocumentOutline;
  readNode(
    document: DocumentState,
    nodeId: import("./ids").NodeId,
  ): AppResult<ReadNodeReceipt>;
  createCheckpoint(
    document: DocumentState,
    reason: "user_turn" | "review_revision",
  ): AppResult<CheckpointCreation>;
  restoreCheckpoint(checkpoint: DocumentCheckpoint): DocumentState;
}
