# Ordino Collaboration Contract — v1

This document is the source of truth for parallel development. All three workstreams implement against these boundaries. Do not change a shared shape without agreement from all teammates.

## Locked product decisions

- Inference is cloud-only through Google AI Studio using AI SDK 7 and `@ai-sdk/google`.
- `GOOGLE_GENERATIVE_AI_API_KEY` is server-only and must never use a `NEXT_PUBLIC_` prefix or enter client bundles. The browser calls same-origin Next.js route handlers under `src/app/api/ai/**`.
- One configurable vision-capable Google AI Studio model performs planning, writing, visual review, and revision.
- Documents are English-only for v1.
- Document storage is a flat, ordered node array.
- The application generates every ID with `crypto.randomUUID()`; the model never creates IDs.
- The mandatory node types are heading, paragraph, list, table, quote, callout, divider, and page break.
- Images uploaded by users are persistent AI reference context. They are not inserted into the PDF in v1.
- Styles use semantic tokens resolved by one renderer-owned `professional` theme. Model-generated numeric PDF/CSS styles are forbidden.
- A single command executor is the only code allowed to mutate document state.
- Vision is read-only. Every deterministic or visual issue is sent to the revision agent; there are no application-level automatic fixes.
- The visual review loop runs at most three times. All rendered pages are reviewed, with no application-enforced page maximum.
- Intermediate renders are hidden. A preview is published only when the agent finishes or reaches the review limit.
- Editing is chat-only. There is no direct block or WYSIWYG editor in v1.
- Only one cancellable agent turn can run at once. New prompts are disabled rather than queued.
- Session JSON persists in IndexedDB. PDFs, rasterized pages, object URLs, and tool traces do not persist.
- Export is always generated locally from current document state and is not blocked by unresolved review issues.
- Checkpoints support undo and failure recovery; the application does not automatically judge or roll back visual quality.
- Document/PDF processing and IndexedDB persistence remain local, but generation and review require internet access. Prompts, relevant reference images, and rasterized PDF pages are sent to Google for processing; the UI must explicitly disclose this cloud data transfer before use.

## Repository ownership

| Area | Exclusive owner |
|---|---|
| `src/contracts/**`, dependency files, shared test configuration | Integrator during Gate 0; frozen afterward |
| `src/document/**`, `src/pdf/**` | Teammate A |
| `src/agent/**`, `src/google-ai/**`, `src/review/**`, `src/app/api/ai/**` | Teammate B |
| `src/app/**` except `src/app/api/ai/**`, `src/components/**`, `src/storage/**`, `src/diagnostics/**`, `public/**`, `next.config.ts` | Teammate C after Gate 0 |

Do not edit another workstream's directory. Cross-module behavior is accessed only through the ports in this document.

## Gate 0 — required before launching three coding agents

The Markdown plans alone are not a sufficient integration boundary. Complete and merge one kickoff commit before parallel work begins:

1. Implement every schema and port in `src/contracts/**`.
2. Export them from `src/contracts/index.ts` and confirm each teammate can import them through `@/contracts`.
3. Install and lock all approved runtime and test dependencies. After this commit, A and B must not run package-install commands.
4. Add the shared test command/configuration once; individual tests stay inside each owned directory.
5. Have the integrator, or Teammate B acting before branch fan-out, run a minimal browser-to-same-origin-route-to-Google AI Studio spike using AI SDK 7 and `@ai-sdk/google`; verify that `GOOGLE_GENERATIVE_AI_API_KEY` is read only by the server route and absent from client bundles.
6. Confirm `pnpm lint`, the shared test command, and `pnpm build` pass.
7. Tag or record this commit hash. All three branches/agents start from exactly that commit.
8. Create one separate Git branch and worktree/checkout per agent. Never run all three agents in the same working directory.

Recommended branches:

```text
feat/document-pdf
feat/agent-review
feat/ui-shell
```

If Gate 0 has not passed, or the agents share one checkout, the three plans are not safe to execute in parallel.

Shared infrastructure ownership after Gate 0:

- Teammate C alone changes `package.json`, the lockfile, test configuration, `next.config.ts`, and `public/**`.
- Teammate A keeps fonts in `src/pdf/assets/**` and configures the pdf.js worker inside `src/pdf/**`; A must not place assets in `public/**`.
- Teammates A and B request dependency or configuration changes from C rather than applying them in their branches.
- No agent runs a repository-wide write formatter. Each agent formats only files in its owned directories.
- Agents may run repository-wide read/build/test commands in their own worktrees.

## Contract implementation rule

Use Zod schemas as the runtime source of truth and infer TypeScript types:

```ts
export const documentStateSchema = z.object({ /* ... */ });
export type DocumentState = z.infer<typeof documentStateSchema>;
```

The interfaces below describe the required shapes. Implement them as Zod schemas in `src/contracts` rather than maintaining duplicate handwritten types.

## IDs

```ts
type Brand<T, Name extends string> = T & { readonly __brand: Name };

export type DocumentId = Brand<string, "DocumentId">;
export type NodeId = Brand<string, "NodeId">;
export type ReferenceImageId = Brand<string, "ReferenceImageId">;
export type CheckpointId = Brand<string, "CheckpointId">;
export type MessageId = Brand<string, "MessageId">;
```

## Universal result and errors

Public integration functions return a result and do not leak exceptions across module boundaries.

```ts
export type AppResult<T, E extends AppError = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };

export interface AppError {
  code: ErrorCode;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export type ErrorCode =
  | "NODE_NOT_FOUND"
  | "NODE_TYPE_MISMATCH"
  | "INVALID_POSITION"
  | "INVALID_NODE"
  | "INVALID_TABLE"
  | "EMPTY_PATCH"
  | "DOCUMENT_EMPTY"
  | "STALE_RENDER"
  | "RENDER_FAILED"
  | "RASTERIZATION_FAILED"
  | "MISSING_API_KEY"
  | "MODEL_AUTH_FAILED"
  | "MODEL_RATE_LIMITED"
  | "MODEL_SERVICE_UNAVAILABLE"
  | "MODEL_UNAVAILABLE"
  | "VISION_UNAVAILABLE"
  | "INTERNET_REQUIRED"
  | "INVALID_MODEL_OUTPUT"
  | "MODEL_REQUEST_FAILED"
  | "ABORTED"
  | "PERSISTENCE_FAILED"
  | "UNKNOWN";
```

## Document metadata and state

```ts
export type WritingStyle =
  | "professional"
  | "academic"
  | "formal"
  | "concise"
  | "persuasive";

export interface DocumentMeta {
  title: string;
  documentType: string;
  audience: string;
  writingStyle: WritingStyle;
  instructions: string | null;
  pageLimit: number | null;
}

export interface DocumentState {
  schemaVersion: 1;
  documentId: DocumentId;
  version: number;         // increments after every successful command
  reviewRevision: number; // increments when a review checkpoint is created
  meta: DocumentMeta;
  nodes: DocumentNode[];
}
```

Workflow status is not part of `DocumentState` because it is transient application state.

## Semantic style tokens

```ts
export type Alignment = "left" | "center" | "right" | "justify";
export type SpacingToken = "none" | "xs" | "sm" | "md" | "lg";
export type Emphasis = "normal" | "bold" | "italic";

export interface BlockSpacing {
  spaceBefore: SpacingToken;
  spaceAfter: SpacingToken;
}

export interface HeadingStyle extends BlockSpacing {
  alignment: "left" | "center" | "right";
  keepWithNext: boolean;
}

export interface ParagraphStyle extends BlockSpacing {
  alignment: Alignment;
  emphasis: Emphasis;
}

export interface ListStyle extends BlockSpacing {
  compact: boolean;
}

export interface TableStyle extends BlockSpacing {
  density: "compact" | "comfortable";
  headerAlignment: "left" | "center" | "right";
  striped: boolean;
}

export interface QuoteStyle extends BlockSpacing {
  alignment: "left" | "center";
}

export interface CalloutStyle extends BlockSpacing {
  variant: "note" | "highlight" | "warning";
}

export interface DividerStyle extends BlockSpacing {
  variant: "solid" | "subtle";
}
```

## Canonical document nodes

All canonical persisted styles are complete. Tool inputs may omit style fields; the command executor fills deterministic defaults.

```ts
export interface HeadingNode {
  id: NodeId;
  type: "heading";
  level: 1 | 2 | 3;
  text: string;
  style: HeadingStyle;
}

export interface ParagraphNode {
  id: NodeId;
  type: "paragraph";
  text: string;
  style: ParagraphStyle;
}

export interface ListNode {
  id: NodeId;
  type: "list";
  ordered: boolean;
  items: string[];
  style: ListStyle;
}

export interface TableColumn {
  header: string;
  widthPercent: number | null;
}

export interface TableNode {
  id: NodeId;
  type: "table";
  columns: TableColumn[];
  rows: string[][];
  style: TableStyle;
}

export interface QuoteNode {
  id: NodeId;
  type: "quote";
  text: string;
  attribution: string | null;
  style: QuoteStyle;
}

export interface CalloutNode {
  id: NodeId;
  type: "callout";
  title: string | null;
  text: string;
  style: CalloutStyle;
}

export interface DividerNode {
  id: NodeId;
  type: "divider";
  style: DividerStyle;
}

export interface PageBreakNode {
  id: NodeId;
  type: "page_break";
}

export type DocumentNode =
  | HeadingNode
  | ParagraphNode
  | ListNode
  | TableNode
  | QuoteNode
  | CalloutNode
  | DividerNode
  | PageBreakNode;
```

### Node constraints

- Heading: 1–200 characters and levels 1–3.
- Paragraph: 1–8,000 characters.
- List: 1–20 plain-text items; each item is 1–1,000 characters; no nesting.
- Table: 1–6 columns and no more than 20 body rows.
- Every table row has exactly the same number of cells as columns.
- Table widths are either all `null` or all supplied and total 100.
- Quote and callout text: 1–4,000 characters.
- No HTML, Markdown AST, nested nodes, merged table cells, or arbitrary rich-text spans.

## Outline

```ts
export interface OutlineItem {
  id: NodeId;
  index: number;
  type: DocumentNode["type"];
  preview: string;
}

export type DocumentOutline = OutlineItem[];
```

Previews are produced deterministically and are at most 120 characters. The agent uses `readNode` when complete content is required.

## Commands and mutation receipts

```ts
export type NodePosition =
  | { kind: "end" }
  | { kind: "before"; nodeId: NodeId }
  | { kind: "after"; nodeId: NodeId };

export interface DocumentChangeSet {
  fromVersion: number;
  toVersion: number;
  addedNodeIds: NodeId[];
  updatedNodeIds: NodeId[];
  movedNodeIds: NodeId[];
  deletedNodeIds: NodeId[];
  affectsPagination: boolean;
}

export type NewDocumentNode =
  | (Omit<HeadingNode, "id" | "style"> & { style?: Partial<HeadingStyle> })
  | (Omit<ParagraphNode, "id" | "style"> & { style?: Partial<ParagraphStyle> })
  | (Omit<ListNode, "id" | "style"> & { style?: Partial<ListStyle> })
  | (Omit<TableNode, "id" | "style"> & { style?: Partial<TableStyle> })
  | (Omit<QuoteNode, "id" | "style"> & { style?: Partial<QuoteStyle> })
  | (Omit<CalloutNode, "id" | "style"> & { style?: Partial<CalloutStyle> })
  | (Omit<DividerNode, "id" | "style"> & { style?: Partial<DividerStyle> })
  | Omit<PageBreakNode, "id">;

export interface AddNodeCommand {
  type: "add_node";
  node: NewDocumentNode;
  position: NodePosition;
}

export interface MoveNodeCommand {
  type: "move_node";
  nodeId: NodeId;
  position: NodePosition;
}

export interface DeleteNodeCommand {
  type: "delete_node";
  nodeId: NodeId;
}

export type EditNodeCommand =
  | {
      type: "edit_node";
      nodeId: NodeId;
      nodeType: "heading";
      patch: { text?: string; level?: 1 | 2 | 3; style?: Partial<HeadingStyle> };
    }
  | {
      type: "edit_node";
      nodeId: NodeId;
      nodeType: "paragraph";
      patch: { text?: string; style?: Partial<ParagraphStyle> };
    }
  | {
      type: "edit_node";
      nodeId: NodeId;
      nodeType: "list";
      patch: { ordered?: boolean; items?: string[]; style?: Partial<ListStyle> };
    }
  | {
      type: "edit_node";
      nodeId: NodeId;
      nodeType: "table";
      patch: { columns?: TableColumn[]; rows?: string[][]; style?: Partial<TableStyle> };
    }
  | {
      type: "edit_node";
      nodeId: NodeId;
      nodeType: "quote";
      patch: { text?: string; attribution?: string | null; style?: Partial<QuoteStyle> };
    }
  | {
      type: "edit_node";
      nodeId: NodeId;
      nodeType: "callout";
      patch: { title?: string | null; text?: string; style?: Partial<CalloutStyle> };
    }
  | {
      type: "edit_node";
      nodeId: NodeId;
      nodeType: "divider";
      patch: { style: Partial<DividerStyle> };
    };

export type DocumentCommand =
  | AddNodeCommand
  | EditNodeCommand
  | MoveNodeCommand
  | DeleteNodeCommand;

export interface MutationReceipt {
  documentVersion: number;
  outline: DocumentOutline;
  changeSet: DocumentChangeSet;
}

export interface AddNodeReceipt extends MutationReceipt {
  nodeId: NodeId;
}

export interface ReadNodeReceipt {
  documentVersion: number;
  node: DocumentNode;
}

export interface FinalizeReceipt {
  finalized: true;
  documentVersion: number;
}

export interface CommandExecution {
  document: DocumentState;
  receipt: MutationReceipt | AddNodeReceipt;
}

export interface CheckpointCreation {
  // Snapshot used by undo/recovery. For review revisions this is the state
  // before the reviewRevision counter advances.
  checkpoint: DocumentCheckpoint;
  // State to continue with. reviewRevision advances only for review_revision.
  document: DocumentState;
}

export interface DocumentPort {
  execute(
    document: DocumentState,
    command: DocumentCommand,
  ): AppResult<CommandExecution>;
  outline(document: DocumentState): DocumentOutline;
  readNode(document: DocumentState, nodeId: NodeId): AppResult<ReadNodeReceipt>;
  createCheckpoint(
    document: DocumentState,
    reason: "user_turn" | "review_revision",
  ): AppResult<CheckpointCreation>;
  restoreCheckpoint(checkpoint: DocumentCheckpoint): DocumentState;
}
```

`DocumentPort` is stateless. Teammate C owns the document between turns; Teammate B owns a local document variable while a turn runs. Each successful tool replaces that local value with `CommandExecution.document`. This prevents A and C from creating competing mutable stores.

Every `EditNodeCommand.patch` must contain at least one field. Enforce this with Zod refinement. Page breaks cannot be edited; they can only be added, moved, or deleted.

The six model tools are:

```ts
addNode(input): Promise<AppResult<AddNodeReceipt>>
editNode(input): Promise<AppResult<MutationReceipt>>
moveNode(input): Promise<AppResult<MutationReceipt>>
deleteNode(input): Promise<AppResult<MutationReceipt>>
readNode(input): Promise<AppResult<ReadNodeReceipt>>
finalizeDocument(input): Promise<AppResult<FinalizeReceipt>>
```

`finalizeDocument` ends the current tool loop. It does not freeze the document or cache a PDF.

## Planning

```ts
export interface DocumentPlan {
  summary: string;
  sections: PlannedSection[];
}

export interface PlannedSection {
  heading: string;
  purpose: string;
  estimatedParagraphs: number;
  includeTable: boolean;
  includeList: boolean;
}
```

Plans are transient, contain no IDs, and do not require user approval.

## Reference images

```ts
export interface ReferenceImage {
  id: ReferenceImageId;
  name: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  dataUrl: string;
  purpose: string | null;
  addedAt: string;
}
```

Reference images persist locally until removed. They are sent to Google AI Studio during planning or an explicitly image-related user turn, but never during PDF visual review. Rasterized PDF pages are instead sent to Google AI Studio for visual review. Prompts and these transmitted images are cloud-processed data and must be covered by the UI's explicit disclosure.

## PDF port

```ts
export interface InternalRenderResult {
  documentId: DocumentId;
  documentVersion: number;
  pdfBlob: Blob;
  pageCount: number;
  renderedAt: string;
}

export interface RasterizedPage {
  documentVersion: number;
  pageNumber: number; // one-based
  mimeType: "image/png";
  dataUrl: string;
  widthPx: number;
  heightPx: number;
}

export interface PublishedPreview {
  documentId: DocumentId;
  documentVersion: number;
  pdfUrl: string;
  publishedAt: string;
}

export interface ExportResult {
  documentId: DocumentId;
  documentVersion: number;
  filename: string;
  blob: Blob;
}

export interface PdfPort {
  render(
    document: DocumentState,
    signal?: AbortSignal,
  ): Promise<AppResult<InternalRenderResult>>;

  rasterize(
    render: InternalRenderResult,
    signal?: AbortSignal,
  ): Promise<AppResult<RasterizedPage[]>>;

  export(
    document: DocumentState,
    existingRender?: InternalRenderResult,
    signal?: AbortSignal,
  ): Promise<AppResult<ExportResult>>;
}
```

The same renderer powers internal review, final preview, and export. Export reuses an artifact only when both `render.documentId === document.documentId` and `render.documentVersion === document.version`; otherwise it rerenders.

## Deterministic validation

```ts
export type ValidationIssueCode =
  | "EMPTY_TEXT_NODE"
  | "HEADING_LEVEL_JUMP"
  | "TRAILING_HEADING"
  | "INVALID_PAGE_BREAK"
  | "CONSECUTIVE_PAGE_BREAKS"
  | "TABLE_COLUMN_MISMATCH"
  | "EMPTY_TABLE_CELL"
  | "PAGE_LIMIT_EXCEEDED"
  | "BLANK_PAGE"
  | "LOW_CONTENT_PAGE"
  | "PDF_PARSE_FAILED";

export interface ValidationIssue {
  source: "document" | "pdf";
  code: ValidationIssueCode;
  severity: "warning" | "error";
  message: string;
  nodeId: NodeId | null;
  pageNumber: number | null;
}

export interface ValidationReport {
  documentVersion: number;
  pass: boolean;
  issues: ValidationIssue[];
}
```

Validation reports problems only. It never mutates state.

## Vision review

```ts
export type VisualIssueType =
  | "overflow"
  | "spacing"
  | "alignment"
  | "orphan_heading"
  | "typography"
  | "whitespace"
  | "table_layout"
  | "visual_hierarchy"
  | "other";

export interface RawVisualIssue {
  type: VisualIssueType;
  severity: "warning" | "error";
  pageNumber: number;
  reportedNodeId: string | null;
  detail: string;
  suggestedAction: string | null;
  confidence: number; // 0–1
}

export interface RawVisualReview {
  pass: boolean;
  issues: RawVisualIssue[];
}

export interface VisualIssue extends Omit<RawVisualIssue, "reportedNodeId"> {
  nodeId: NodeId | null;
}

export interface VisualReviewResult {
  documentVersion: number;
  pass: boolean;
  issues: VisualIssue[];
}
```

Unknown model-reported node IDs normalize to `null`. Vision cannot call mutation tools. All validation and vision issues go to the revision agent.

## Checkpoints, conversation, and persistence

```ts
export interface DocumentCheckpoint {
  id: CheckpointId;
  reason: "user_turn" | "review_revision";
  document: DocumentState;
  createdAt: string;
}

export interface ConversationMessage {
  id: MessageId;
  role: "user" | "assistant";
  text: string;
  referenceImageIds: ReferenceImageId[];
  createdAt: string;
}

export interface PersistedSession {
  schemaVersion: 1;
  document: DocumentState;
  messages: ConversationMessage[];
  referenceImages: ReferenceImage[];
  checkpoints: DocumentCheckpoint[];
  savedAt: string;
}

export interface SessionRepository {
  load(): Promise<AppResult<PersistedSession | null>>;
  save(session: PersistedSession): Promise<AppResult<void>>;
  clear(): Promise<AppResult<void>>;
}
```

Do not persist PDF blobs, rasterized pages, object URLs, tool traces, model reasoning, temporary responses, or abort controllers.

## Workflow events

```ts
export type WorkflowStage =
  | "idle"
  | "planning"
  | "generating"
  | "rendering"
  | "validating"
  | "rasterizing"
  | "reviewing"
  | "revising"
  | "finalizing"
  | "ready"
  | "failed"
  | "cancelled";

export interface WorkflowEvent {
  stage: WorkflowStage;
  message: string;
  level: "info" | "success" | "warning" | "error";
  createdAt: string;
}

export interface AgentTurnState {
  running: boolean;
  stage: WorkflowStage;
  reviewIteration: 0 | 1 | 2 | 3;
}
```

## Agent orchestration port

Teammate B implements this port; Teammate C consumes it. Dependencies are injected so Teammate B can develop with fakes.

```ts
export interface AgentRuntimeDependencies {
  document: DocumentPort;
  pdf: PdfPort;
  validateDocument(document: DocumentState): ValidationReport;
  validatePdf(
    document: DocumentState,
    render: InternalRenderResult,
  ): Promise<ValidationReport>;
  onEvent(event: WorkflowEvent): void;
}

export interface AgentTurnInput {
  // Current turn only; it must not also appear in conversation.
  userMessage: string;
  document: DocumentState;
  // Completed turns only, excluding the current userMessage.
  conversation: ConversationMessage[];
  referenceImages: ReferenceImage[];
  signal?: AbortSignal;
}

export interface AgentTurnOutput {
  document: DocumentState;
  createdCheckpoints: DocumentCheckpoint[];
  finalRender: InternalRenderResult;
  validation: ValidationReport; // merged structural + PDF report
  visualReview: VisualReviewResult | null;
  reviewIterations: 0 | 1 | 2 | 3;
  assistantMessage: string;
}

export interface AgentTurnRecovery {
  document: DocumentState;
  createdCheckpoints: DocumentCheckpoint[];
  lastValidRender: InternalRenderResult | null;
}

export interface AgentTurnError extends AppError {
  recovery: AgentTurnRecovery;
}

export interface AgentPort {
  runTurn(
    input: AgentTurnInput,
  ): Promise<AppResult<AgentTurnOutput, AgentTurnError>>;
}
```

The input does not contain a separately supplied outline because it could disagree with the document. Teammate B derives the outline through `DocumentPort.outline(input.document)`.

B collects every user-turn and review checkpoint created during the run and returns them in `createdCheckpoints`; C appends and persists them. On cancellation, partial generation failure, or revision failure, recovery contains the latest successfully mutated document—not an automatically restored checkpoint. The pre-revision checkpoint is retained for explicit Undo. `AgentTurnError.recovery` carries the latest valid document/checkpoints/render so completed work is not lost.

C persists the current user message when the turn starts but passes B a pre-turn conversation snapshot. C appends `assistantMessage` only after successful completion, preventing the current prompt from being sent twice.

The Google AI Studio adapter and same-origin AI route handlers are internal to Teammate B and use `GoogleAIConfiguration`; they are not a second shared state owner. B's browser-facing `AgentPort` may orchestrate calls to `src/app/api/ai/**`, while document/PDF state remains in the browser and no secret enters client bundles. For startup composition, B exports this narrow diagnostic port:

```ts
export interface ModelDiagnosticPort {
  checkApiKey(signal?: AbortSignal): Promise<AppResult<void>>;
  checkAuthentication(signal?: AbortSignal): Promise<AppResult<void>>;
  checkService(signal?: AbortSignal): Promise<AppResult<void>>;
  checkModelAvailable(signal?: AbortSignal): Promise<AppResult<void>>;
  warmUpText(signal?: AbortSignal): Promise<AppResult<void>>;
  checkVision(signal?: AbortSignal): Promise<AppResult<void>>;
}
```

## Google AI Studio configuration and diagnostics

```ts
export interface GoogleAIConfiguration {
  provider: "google-ai-studio";
  modelId: string;
  transportRetries: number;
}

// The API key is intentionally absent. Server routes read it from the
// server-only GOOGLE_GENERATIVE_AI_API_KEY environment variable.

export type DiagnosticName =
  | "api_key"
  | "authentication"
  | "rate_limit"
  | "internet"
  | "google_ai_service"
  | "model"
  | "vision"
  | "pdf_renderer"
  | "storage"
  | "export";

export interface DiagnosticCheck {
  name: DiagnosticName;
  status: "checking" | "ready" | "failed";
  message: string;
  remediation: string | null;
}

export interface StartupDiagnosticResult {
  ready: boolean;
  checks: DiagnosticCheck[];
}

export interface StartupDiagnosticDependencies {
  model: ModelDiagnosticPort;
  checkStorage(signal?: AbortSignal): Promise<AppResult<void>>;
  checkPdfRenderer(signal?: AbortSignal): Promise<AppResult<void>>;
  checkExport(signal?: AbortSignal): Promise<AppResult<void>>;
}

export function runStartupDiagnostics(
  dependencies: StartupDiagnosticDependencies,
  signal?: AbortSignal,
): Promise<StartupDiagnosticResult>;
```

`validateDocument` and `validatePdf` are the deliberate exceptions to the universal `AppResult` rule: they always return a `ValidationReport`. PDF parsing problems become a `PDF_PARSE_FAILED` issue. Rendering, rasterization, and exporting return failed `AppResult`s for operational failures.

AI SDK 7 transport retries are set to two. Successful but invalid structured output receives one explicit Zod-guided repair request. Diagnostics and errors distinguish a missing server key, authentication failure, rate limiting, internet failure, Google service unavailability, configured-model unavailability, and vision unavailability. Planning failure shows Retry; partial generation preserves valid nodes; vision failure exports the current document; revision failure keeps the pre-revision checkpoint.

## Required review flow

```text
Prompt + relevant reference images
  → same-origin AI route → Google AI Studio
  → structured plan
  → document tool loop
  → finalizeDocument
  → hidden render
  → structural and PDF validation
  → rasterize all pages locally
  → send rasterized pages through same-origin AI route
  → Google AI Studio read-only vision review
  → if issues: checkpoint, revision-agent tool loop, hidden rerender
  → repeat up to three reviews
  → publish final preview
  → persist session JSON
  → export from current document state
```

## Exact public factory exports

Gate 0 contracts lock these import names so consumers can compile against local fakes before implementations merge:

```ts
// src/document/index.ts — Teammate A
export function createDocument(meta: DocumentMeta): DocumentState;
export function createDocumentPort(): DocumentPort;
export function validateDocument(document: DocumentState): ValidationReport;

// src/pdf/index.ts — Teammate A
export function createPdfPort(): PdfPort;
export function validatePdf(
  document: DocumentState,
  render: InternalRenderResult,
): Promise<ValidationReport>;

// src/agent/index.ts — Teammate B
export function createAgent(
  dependencies: AgentRuntimeDependencies,
  configuration: GoogleAIConfiguration,
): AgentPort;

// src/google-ai/index.ts — Teammate B
export function createModelDiagnosticPort(
  configuration: GoogleAIConfiguration,
): ModelDiagnosticPort;
```

## Merge protocol

1. Complete Gate 0 and create separate A, B, and C-shell branches/worktrees from its exact commit.
2. Each teammate works only in their owned directories.
3. A and B use private fakes in their own test directories. C creates temporary C-owned fakes under `src/app/testing/**`; C does not depend on fakes that exist only on unfinished A/B branches.
4. Merge completed A, B, and fake-backed C-shell branches into the target branch. They are physically disjoint and may merge in any order.
5. Create a short integration branch from the combined target branch. Teammate C replaces its temporary fakes and composes the exact public factories.
6. Resolve integration problems by adapting implementations to this contract; do not bypass the ports.
7. Run `pnpm lint`, the shared test command, and `pnpm build` after every merge and on the final integration branch.
8. If a contract change becomes unavoidable, stop affected workstreams, update `src/contracts` in one integration commit, then rebase all affected branches onto that commit.

## Definition of done

A complete demo must show:

1. Startup diagnostics and model warm-up.
2. Prompt plus optional persistent reference images.
3. Automatic planning and tool-driven document creation.
4. Hidden PDF rendering and deterministic validation.
5. Full-document Google AI Studio vision review, with rasterized pages disclosed as cloud-transferred data.
6. AI-driven revision, with at most three review rounds.
7. Final-only PDF preview publication.
8. Follow-up chat editing through the same tools.
9. Undo through checkpoints.
10. IndexedDB session recovery after refresh.
11. Current-state PDF export generated locally; generation and visual review clearly require internet access.
