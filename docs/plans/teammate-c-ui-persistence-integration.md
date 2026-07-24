# Teammate C Plan — UI, Persistence, Diagnostics, and Integration Shell

## Mission

Own the user-facing Next.js PWA, IndexedDB recovery, startup diagnostics, workflow status, cancellation, final-only preview publication, export controls, and final composition of Teammates A and B.

Read `docs/collaboration-contracts.md` first. Its contracts are authoritative.

## Exclusive write set

```text
src/app/** except src/app/api/ai/**
src/components/**
src/storage/**
src/diagnostics/**
public/**
next.config.ts
```

Teammate C is also the designated dependency-file owner when the team approves a dependency change:

```text
package.json
pnpm-lock.yaml
```

Do not edit:

```text
src/document/**
src/pdf/**
src/agent/**
src/google-ai/**
src/review/**
src/app/api/ai/**
src/contracts/**
```

Do not implement duplicate document mutation, PDF rendering, or model logic inside UI components.

## Required directory shape

```text
src/components/
├── app-shell/
├── chat/
├── diagnostics/
├── document-outline/
├── pdf-preview/
├── reference-images/
├── status-panel/
└── ui/

src/storage/
├── indexeddb-session-repository.ts
├── serialization.ts
├── autosave.ts
├── index.ts
└── __tests__/

src/diagnostics/
├── run-startup-diagnostics.ts
├── diagnostic-messages.ts
├── index.ts
└── __tests__/

src/app/                 # excludes B-owned src/app/api/ai/**
├── layout.tsx
├── page.tsx
├── globals.css
├── manifest.ts
└── ...
```

## Gate 0 prerequisite — separate kickoff commit

This is not part of C's parallel branch. Before launching any of the three coding agents, the integrator completes and merges a separate kickoff commit implementing `src/contracts/**`, approved dependencies, the shared test setup, and all Gate 0 checks in `docs/collaboration-contracts.md`. C's do-not-edit rule for `src/contracts/**` begins after that commit.

Expected dependency categories:

- AI SDK 7 and `@ai-sdk/google` for B's server-only Google AI Studio gateway
- Zod
- `@react-pdf/renderer`
- `pdfjs-dist`
- IndexedDB helper if the team chooses one
- Test tooling if added

Use `crypto.randomUUID()` rather than adding UUID solely for browser ID generation.

Keep document/PDF state, rendering, persistence, and browser orchestration client-side. Teammate B exclusively implements `src/app/api/ai/**`; C must not add or modify AI route handlers or call Google directly.

Document local execution at `http://localhost:3000`, the server-only `GOOGLE_GENERATIVE_AI_API_KEY`, and the requirement for internet access to Google AI Studio. Never use a `NEXT_PUBLIC_` key. A cloud deployment is optional for the demo, but cloud inference is mandatory.

## Work package C2 — Application state shell

Create one client-side session controller that owns:

- Current `DocumentState`
- Conversation messages
- Active reference images
- Checkpoints
- Workflow events
- Current published preview
- Current `AbortController`
- Whether an agent turn is active
- The pre-turn conversation snapshot used to prevent sending the current message twice
- Whether the user has acknowledged the explicit Google AI Studio cloud-data-transfer disclosure

React components consume this controller but do not directly mutate document nodes.

The session controller is the only owner of document state between turns. During a running turn it passes a snapshot to `AgentPort`; it does not mutate that document concurrently. On success it atomically replaces session state with `AgentTurnOutput.document` and appends `createdCheckpoints`. On failure or cancellation it applies `AgentTurnError.recovery` before showing the error, ensuring completed mutations and checkpoints are not lost.

`DocumentPort` is stateless and is used directly only for UI-owned recovery operations such as undo. Avoid duplicated mutable stores or a document singleton.

## Work package C3 — IndexedDB persistence

Implement `SessionRepository` exactly as defined in the collaboration contract.

Persist:

- Document JSON
- Metadata
- Messages
- Reference images and their data URLs
- Checkpoints

Do not persist:

- PDF `Blob`s
- Object URLs
- Rasterized page images
- Tool traces
- Abort controllers
- Workflow internals

Behavior:

- Load the last session during startup.
- Validate loaded JSON through Zod before using it.
- Autosave after successful document/message/reference/checkpoint changes.
- Surface a typed persistence failure without destroying in-memory work.
- Provide a clear “new document” action that clears persisted session after confirmation.
- Rebuild the PDF from restored JSON rather than expecting a cached blob.

## Work package C4 — Startup diagnostics

Compose checks for:

- IndexedDB read/write
- Server-side `GOOGLE_GENERATIVE_AI_API_KEY` presence through B's safe diagnostic route
- Internet connectivity and Google AI Studio service availability
- API-key authentication
- Rate-limit state when reported
- Configured model availability
- Model text warm-up
- Model vision capability
- PDF renderer smoke render
- Export pipeline readiness

Show each `DiagnosticCheck` independently. Disable the main chat only when a mandatory check prevents generation.

Show actionable, non-secret remediation for missing server key, authentication failure, rate limiting, internet failure, Google service unavailability, configured-model unavailability, and vision unavailability. Missing-key guidance must name `GOOGLE_GENERATIVE_AI_API_KEY` and state that it belongs in the server environment without a `NEXT_PUBLIC_` prefix.

Do not silently continue when cloud inference is unavailable. Never display, request, persist, or send the API key from the browser.

Use injected fake health and renderer methods until Teammates A and B merge.

## Work package C5 — Main UI

Build a focused demo interface with:

- Chat composer
- Reference-image attachment area
- Read-only document outline
- Workflow status panel
- PDF preview panel
- Undo
- Cancel
- Export PDF
- Retry after recoverable failures

V1 has no direct node editor, rich-text editor, or drag-and-drop document editing.

Cloud-processing disclosure:

- Before the first model request, explicitly tell users that prompts, relevant reference images, and rasterized PDF pages are sent to Google AI Studio for processing.
- State that document/PDF generation and IndexedDB persistence remain local, while AI generation and visual review require internet access.
- Require acknowledgement before enabling generation, and keep the disclosure accessible afterward.
- Do not imply that uploaded or rasterized images remain exclusively on-device.

Reference-image behavior:

- Accept PNG, JPEG, and WebP.
- Convert to the shared persisted representation.
- Allow an optional purpose/description.
- Show active references and allow removal.
- Keep references active until removed.

Chat behavior:

- Persist the current user message when starting a turn, but pass B the conversation snapshot from before that message was appended.
- Append the assistant message only after successful completion.
- Disable submission, Undo, New Document, reference removal, and every document-replacing action while a turn runs.
- Cancellation must finish and typed recovery must be applied before those actions become available again.
- Do not queue messages.
- Cancel aborts the active turn and applies its typed recovery payload.
- Keep previous published preview visible while a follow-up revision runs.
- Preserve the user's message when planning fails so Retry can reuse it.

## Work package C6 — Workflow status panel

Render only `WorkflowEvent` data:

```text
Planning document
Writing sections
Rendering PDF
Checking layout
Reviewing visually
Revising document
Finalizing
Export ready
```

Do not display chain-of-thought, hidden prompts, raw tool traces, base64 data, or model internals.

Provide clear visual treatment for running, completed, failed, and cancelled stages.

## Work package C7 — Final-only PDF preview

Teammate B returns `AgentTurnOutput.finalRender`. Publish it only after `runTurn` completes.

Behavior:

- Convert the final PDF blob to an object URL.
- Revoke the previous object URL when replacing it or unmounting.
- Do not publish intermediate render artifacts.
- Keep the old preview visible during later revisions.
- If a turn is cancelled, keep the previous published preview unless the user explicitly requests export of recovered partial work.
- After restoring JSON from IndexedDB, regenerate a preview through Teammate A's renderer.

The UI does not independently generate a different PDF layout.

## Work package C8 — Undo and export

Undo:

- Restore the latest checkpoint through the document module.
- Persist the restored state.
- Regenerate the preview.
- Keep conversation messages unless the team explicitly chooses message-level undo later.

Export:

- Call Teammate A's export function with current state.
- Reuse a render only when versions match.
- Allow export after the review limit or review failure.
- Never download a stale preview blob when the document version has changed.

## Work package C9 — PWA/local shell

Provide:

- Web app manifest
- Installable application metadata/icons
- Cached application shell and local static assets where supported
- Clear offline behavior: local session recovery, PDF rendering, and export may remain available, but generation and visual review are disabled

Do not claim that generation is fully offline. Diagnostics and status messaging must explain that Google AI Studio inference requires internet access and a valid server-side API key.

Treat sophisticated service-worker update handling as secondary to reliable local document recovery and export.

## Work package C10 — Final integration

Before A and B merge, create temporary C-owned fakes under `src/app/testing/**` for:

- `AgentPort`
- `PdfPort`
- Fixture `DocumentState`
- `ModelDiagnosticPort` and startup checks

Do not import fakes or fixtures that exist only on unfinished A/B branches.

After merging:

1. Replace fake document/PDF dependencies with Teammate A exports.
2. Replace fake agent/model dependencies with Teammate B exports.
3. Compose the exact `AgentRuntimeDependencies` and `GoogleAIConfiguration` in one integration module owned by C, including both injected validation functions. The configuration contains only `provider`, `modelId`, and `transportRetries`; the server-only API key is not part of composition.
4. Verify that no UI code mutates nodes directly.
5. Verify intermediate renders never become the published preview.
6. Verify every successful state transition triggers persistence.

## Acceptance checks

- Refresh restores session JSON from IndexedDB.
- Restored JSON is Zod-validated before use.
- Reference images persist until removed.
- Chat cannot submit two simultaneous turns.
- Cancel aborts work, applies typed recovery state, and retains the previous preview.
- Status panel never exposes tool traces or reasoning.
- Preview appears only after the complete agent loop.
- Follow-up chat keeps the old preview visible until replacement is ready.
- Undo restores a checkpoint and rerenders.
- Export reuses a render only when both document ID and version match.
- Missing-key, authentication, rate-limit, internet, Google service, model, and vision failures show actionable diagnostics.
- The browser uses only B-owned same-origin AI routes; no secret enters client bundles or browser requests.
- The UI explicitly discloses that prompts, relevant reference images, and rasterized PDF pages are sent to Google AI Studio.
- Local document/PDF/IndexedDB functions remain usable where possible without internet, while generation and review clearly require it.

## Required public barrels

Expose:

```ts
// src/storage/index.ts
createSessionRepository(): SessionRepository

// src/diagnostics/index.ts
runStartupDiagnostics(
  dependencies: StartupDiagnosticDependencies,
  signal?: AbortSignal,
): Promise<StartupDiagnosticResult>
```

Keep app composition inside C's owned UI/integration files rather than adding cross-workstream bootstrap files.

## Merge order

1. Merge the separate Gate 0 contracts/dependencies commit.
2. Start A, B, and fake-backed C-shell branches from that exact commit.
3. Merge completed A, B, and C-shell branches into the target branch; their write sets are disjoint, so their order is not important.
4. Create a short C-owned integration branch from the combined target branch.
5. Replace C's temporary fakes with the exact A/B public factories, then run lint, tests, build, and the demo smoke test.

## Final demo smoke test

1. Set `GOOGLE_GENERATIVE_AI_API_KEY` in the server environment without a `NEXT_PUBLIC_` prefix and start the Next.js app with internet access.
2. Open the app, acknowledge the cloud-data-transfer disclosure, and pass diagnostics/warm-up through B's same-origin routes.
3. Attach a reference image with the understanding that relevant images may be sent to Google AI Studio.
4. Ask for a professional proposal.
5. Observe status stages while intermediate PDFs remain hidden.
6. Receive the reviewed final PDF preview.
7. Refresh and recover the session from IndexedDB.
8. Request a chat-based revision.
9. Undo once.
10. Export the latest PDF and confirm it matches the current document.
