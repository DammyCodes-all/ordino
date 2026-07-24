# Teammate A Plan — Document Core and PDF Pipeline

## Mission

Own the deterministic half of Ordino: canonical document state, the only mutation path, validation, checkpoints, PDF rendering, rasterization, and export.

Read `docs/collaboration-contracts.md` first. Its types and behavior are authoritative.

## Exclusive write set

```text
src/document/**
src/pdf/**
```

Do not edit:

```text
src/app/**
src/components/**
src/agent/**
src/ollama/**
src/review/**
src/storage/**
src/diagnostics/**
package.json
pnpm-lock.yaml
src/contracts/**
```

If a contract is insufficient, report the required change to the team instead of changing it independently.

## Required directory shape

```text
src/document/
├── create-document.ts
├── defaults.ts
├── command-executor.ts
├── document-port.ts
├── outline.ts
├── checkpoints.ts
├── validate-document.ts
├── fixtures.ts
├── index.ts
└── __tests__/

src/pdf/
├── components/
│   ├── document-pdf.tsx
│   ├── heading-node.tsx
│   ├── paragraph-node.tsx
│   ├── list-node.tsx
│   ├── table-node.tsx
│   ├── quote-node.tsx
│   ├── callout-node.tsx
│   ├── divider-node.tsx
│   └── page-break-node.tsx
├── professional-theme.ts
├── render-document.ts
├── rasterize-pdf.ts
├── validate-pdf.ts
├── export-document.ts
├── pdf-port.ts
├── index.ts
└── __tests__/
```

The exact internal filenames may change, but all writes remain inside the two owned directories.

## Work package A1 — Canonical document construction

Implement:

```ts
createDocument(meta: DocumentMeta): DocumentState
```

Requirements:

- Generate `documentId` in application code.
- Set `schemaVersion` to `1`.
- Set `version` and `reviewRevision` to `0`.
- Begin with an empty node array.
- Normalize metadata strings and preserve `pageLimit: null` when absent.

Create default semantic styles for every node type. Canonical persisted nodes always contain complete styles even when model tool inputs omit them.

## Work package A2 — Single command executor

Implement one pure entry point:

```ts
executeCommand(
  document: DocumentState,
  command: DocumentCommand,
): AppResult<{
  document: DocumentState;
  receipt: MutationReceipt | AddNodeReceipt;
}>
```

Requirements:

- Never mutate the input object.
- Generate new node IDs for `add_node`.
- Increment `version` exactly once for each successful command.
- Do not increment the version after a failed command.
- Return a complete outline and change set.
- Validate the resulting document with shared Zod schemas.
- Reject missing nodes, mismatched node types, empty patches, and invalid tables.
- Reject moving a node before or after itself.
- Correctly move a node when the target appears before or after its current index.
- Mark `affectsPagination` true for every content, style, order, addition, and deletion change in v1.

No React state setter, Ollama call, PDF import, or IndexedDB access belongs in the executor.

## Work package A3 — Outline and read behavior

Implement deterministic outline generation:

```ts
createOutline(document: DocumentState): DocumentOutline
```

Previews are at most 120 characters. Include the current zero-based node index.

Implement the exact stateless `DocumentPort` from the collaboration contract. Every method receives the document it operates on; this module does not retain a current in-memory snapshot.

- `execute(document, command)` delegates to `executeCommand` and returns the replacement document.
- `outline(document)` derives an outline from that document.
- `readNode(document, nodeId)` reads from that document.
- `createCheckpoint(document, reason)` returns both the checkpoint and the document to continue with.
- `restoreCheckpoint(checkpoint)` returns an isolated document snapshot.

Teammate C owns state between agent turns. Teammate B owns a local document variable during a turn and replaces it after each successful command. Do not expose a mutable nodes array, singleton document store, or React state setter.

## Work package A4 — Checkpoints

Implement:

```ts
createCheckpoint(
  document: DocumentState,
  reason: "user_turn" | "review_revision",
): AppResult<CheckpointCreation>

restoreCheckpoint(checkpoint: DocumentCheckpoint): DocumentState
```

The checkpoint stores an isolated snapshot of the input document. For `review_revision`, the returned continuation document increments `reviewRevision`; the checkpoint remains the pre-increment recovery state. For `user_turn`, the continuation document keeps the same counters. Checkpoint bookkeeping does not increment the content `version`. Use `structuredClone` for isolation.

Do not automatically compare review quality or restore an older checkpoint.

## Work package A5 — Structural validation

Implement deterministic checks for:

- Empty heading, paragraph, quote, callout, and list text
- Heading level jumps such as level 1 directly to level 3
- Heading as the final content node
- Leading, trailing, and consecutive page breaks
- Table column/row length mismatch
- Empty table cells
- Invalid table width configuration
- Invalid semantic style tokens through schema validation

Validation reports issues only. It must never mutate the document.

## Work package A6 — Professional React PDF renderer

Render all eight mandatory node types with one theme:

- Heading
- Paragraph
- List
- Table
- Quote
- Callout
- Divider
- Page break

Requirements:

- Keep bundled font files inside `src/pdf/assets/**`; do not write to C-owned `public/**`.
- Configure any pdf.js worker import within `src/pdf/**`; do not require C to copy a worker into `public/**`.
- Do not fetch fonts or workers at runtime.
- Resolve semantic tokens to exact React PDF styles inside `professional-theme.ts`.
- Add deterministic page margins, typography hierarchy, page numbers, and a restrained footer.
- Keep renderer code free of AI logic.
- Support table splitting where React PDF permits it.
- Keep table headers visually distinct.
- Avoid arbitrary style values from document nodes.
- Return a `Blob` tagged with the source document version.

Implement:

```ts
render(document, signal?): Promise<AppResult<InternalRenderResult>>
```

## Work package A7 — PDF validation and rasterization

Using `pdfjs-dist`:

- Obtain the actual page count.
- Extract text per page for blank/low-content checks.
- Compare actual page count with optional user-controlled `pageLimit`.
- Rasterize every page to PNG.
- Return pages in one-based page order.
- Check `AbortSignal` between page operations.
- Represent PDF parsing problems as a `PDF_PARSE_FAILED` issue in the returned `ValidationReport`.
- Convert rendering, rasterization, and export operational failures to `AppResult` errors.

Do not attempt unreliable node-to-page mapping in v1.

## Work package A8 — Export

Implement export through `PdfPort.export`:

```ts
export(
  document: DocumentState,
  existingRender?: InternalRenderResult,
  signal?: AbortSignal,
): Promise<AppResult<ExportResult>>
```

Reuse a render only when both its `documentId` and `documentVersion` match the current document. Otherwise rerender. Never cache a “final” PDF independently of current state.

Return the blob and sanitized filename together. Derive the filename from `DocumentMeta.title`, with a safe fallback such as `document.pdf`.

## Mock required for independent work

Provide a fixture document containing every node type:

```ts
export const professionalDocumentFixture: DocumentState
```

This fixture is the stable input for PDF development before the agent exists.

## Acceptance checks

- Adding a node creates an application ID and returns it.
- Invalid commands return typed failures and leave input unchanged.
- Every successful command increments `version` once.
- Outline previews are deterministic.
- Undo restoration produces an isolated snapshot.
- Every mandatory node type appears in a generated PDF.
- A multipage PDF rasterizes into one PNG per page.
- A render from another document with the same version is not reused.
- A stale render is not exported.
- A requested page limit is reported but does not prevent export.
- No intermediate artifact is persisted by this module.

## Required public barrel

`src/document/index.ts` must export exactly the shared `createDocument`, `createDocumentPort`, and `validateDocument` factories/functions. `src/pdf/index.ts` must export exactly `createPdfPort` and `validatePdf` as its cross-workstream API. Export is accessed through `PdfPort.export`. Do not make UI components or internal renderer helpers part of the public API.

## Handoff to integration

Provide Teammate C with:

- `createDocument`
- `createDocumentPort` (checkpoint behavior is accessed through this port)
- `validateDocument`
- `createPdfPort` (including `PdfPort.export`)
- `validatePdf`

After branches merge, Teammate B consumes the same exact public factories. During parallel work B uses B-owned private fakes and does not import A's fixture or test helpers.
