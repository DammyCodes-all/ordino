# Teammate B Plan — AI Orchestration, Ollama, and Review Loop

## Mission

Own all model-facing behavior: direct browser-to-Ollama communication, structured planning, six document tools, prompt rebuilding, visual review, revision, retries, cancellation, and the three-pass orchestration loop.

Read `docs/collaboration-contracts.md` first. Its contracts are authoritative.

## Exclusive write set

```text
src/agent/**
src/ollama/**
src/review/**
```

Do not edit:

```text
src/app/**
src/components/**
src/document/**
src/pdf/**
src/storage/**
src/diagnostics/**
package.json
pnpm-lock.yaml
src/contracts/**
```

Request shared contract or dependency changes through the integrator rather than editing shared files.

## Required directory shape

```text
src/ollama/
├── configuration.ts
├── ollama-client.ts
├── model-port.ts
├── structured-output.ts
├── errors.ts
├── index.ts
└── __tests__/

src/agent/
├── prompts/
│   ├── system-prompt.ts
│   ├── planner-prompt.ts
│   ├── writer-prompt.ts
│   └── revision-prompt.ts
├── planner.ts
├── tool-definitions.ts
├── tool-executor.ts
├── context-builder.ts
├── run-tool-loop.ts
├── orchestrator.ts
├── fake-dependencies.ts
├── index.ts
└── __tests__/

src/review/
├── vision-prompt.ts
├── normalize-review.ts
├── review-pages.ts
├── revision-context.ts
├── index.ts
└── __tests__/
```

## Work package B1 — Direct Ollama gateway

Implement a browser-safe model adapter using the configured Ollama base URL and model ID.

Requirements:

- No Next.js route handlers, server actions, Node-only APIs, or secret keys.
- Accept `AbortSignal` for every request.
- Configure AI SDK transport retries to two.
- Convert transport and model errors to shared `AppResult` errors.
- Keep model ID configurable rather than hardcoded in prompts.
- Support both text and image inputs through the same model configuration.
- Never log base64 reference or rendered-page images.

Verify the chosen AI SDK Ollama provider can run in the browser during Gate 0. If it cannot, use Ollama's local HTTP API behind B's internal model adapter; do not invent an undefined shared `ModelPort` or introduce a backend.

## Work package B2 — Structured output validation and repair

Every structured model response is parsed through shared Zod schemas.

Implement this policy:

1. Make the normal model request.
2. Validate the response.
3. If validation fails, make one compact repair request containing the invalid output, validation messages, and required schema instructions.
4. Validate once more.
5. Return `INVALID_MODEL_OUTPUT` if repair fails.

Do not use regex to pull JSON out of arbitrary prose. Do not silently fill missing semantic fields unless the shared schema defines defaults.

## Work package B3 — Turn context rebuilding

Build every turn from current state rather than accumulated tool traces. Derive the outline with `DocumentPort.outline(input.document)`; `AgentTurnInput` deliberately has no separate outline field that could become stale.

System context includes:

- Document metadata
- Current outline
- Current document version
- Current review revision
- Tool rules
- English-only instruction
- Rule that IDs for new nodes are application-generated

Conversation context includes only completed prior user and assistant messages. `input.userMessage` is the current turn and must not also be present in `input.conversation`. Exclude completed tool traces and chain-of-thought.

Reference images are included only when:

- Starting initial generation with attached active references, or
- The current user message explicitly asks the model to use them

Rendered PDF pages are used only by the vision reviewer and never mixed with reference images.

## Work package B4 — Structured planner

Implement:

```ts
planDocument(input): Promise<AppResult<DocumentPlan>>
```

Rules:

- Produce a small plan with no IDs.
- Do not wait for user approval.
- Respect metadata, optional page limit, and reference images.
- Do not create the actual document during planning.
- On failure, return a retryable error while preserving the user's prompt in UI-owned state.

## Work package B5 — Six model tools

Expose exactly:

- `addNode`
- `editNode`
- `moveNode`
- `deleteNode`
- `readNode`
- `finalizeDocument`

Tool inputs use shared Zod schemas. Tool implementations delegate to the injected stateless `DocumentPort`; they never mutate arrays or React state themselves. The tool loop starts with `input.document`, holds it in one local variable, and replaces that variable with `CommandExecution.document` after every successful mutation.

Never let both a closure and the UI own independently mutable document copies. The local turn document is returned as `AgentTurnOutput.document` and only then becomes C's session state.

Every tool result uses `AppResult`. Failed tool calls are returned to Gemma during the active loop so it can recover from bad IDs or arguments.

`finalizeDocument` ends the current tool loop but does not generate or cache a PDF.

Set a bounded tool-step limit. If the model reaches the limit with meaningful document content, stop tool execution and continue to rendering rather than discarding the document.

## Work package B6 — Read-only visual reviewer

Inputs:

- Every rasterized PDF page
- Current document outline
- Document metadata
- Deterministic validation issues

Output:

- `RawVisualReview` validated with Zod
- Normalized `VisualReviewResult`

Normalization rules:

- Verify every page number is in range.
- Resolve a reported node ID only when it exists in the supplied outline.
- Convert unknown IDs to `null`.
- Clamp/reject confidence outside 0–1 according to the shared schema policy.
- Vision does not receive document mutation tools.

The review prompt asks for observable layout critique, not hidden reasoning.

## Work package B7 — Revision agent

Combine deterministic and visual issues into a concise revision context.

The revision agent may use the same six tools. It must:

- Read a node before making a content-sensitive edit when the outline preview is insufficient.
- Preserve document meaning unless the reported issue requires shortening or restructuring.
- Call `finalizeDocument` when revisions are complete.
- Receive no application-generated automatic style fixes.

Create a review checkpoint through the injected document dependency before executing review-driven changes. On success, immediately replace the local turn document with `CheckpointCreation.document` before the first revision mutation, then append `CheckpointCreation.checkpoint` to the local checkpoint array. Return that array through `AgentTurnOutput.createdCheckpoints` or `AgentTurnError.recovery.createdCheckpoints`.

## Work package B8 — Complete orchestration loop

Implement `AgentPort.runTurn`.

Initial generation:

```text
emit planning
→ plan
→ emit generating
→ writer tool loop
→ emit rendering
→ hidden PDF render
→ emit validating
→ structural and PDF validation
→ emit rasterizing
→ rasterize every page
→ emit reviewing
→ read-only visual review
```

Revision behavior:

- If validation and vision pass, finalize.
- If issues remain, create checkpoint and run the revision tool loop.
- Rerender and review again.
- Stop after at most three visual review iterations.
- Return the latest valid render even if issues remain.
- Do not publish a preview; Teammate C owns publication.

Follow-up chat editing uses the same path but skips initial planning when a document already exists. Before the first follow-up mutation, create one `user_turn` checkpoint and include it in the returned checkpoint array. Initial generation from an empty document does not need a user-turn checkpoint.

## Work package B9 — Cancellation and fallbacks

Check `AbortSignal` before/after:

- Planning
- Each model request
- Each tool execution
- Rendering dependency calls
- Rasterization dependency calls
- Review and revision transitions

On cancellation:

- Stop future work.
- Preserve successful mutations already made.
- Return `ABORTED` as `AgentTurnError`.
- Put the latest local document, all newly created checkpoints, and any last valid render in `error.recovery`.
- Do not automatically roll back the entire user turn.

Fallbacks:

- Planning failure: return error for UI Retry.
- Partial generation failure: preserve meaningful valid nodes.
- Vision failure: return current valid render and `visualReview: null`.
- Revision failure: return the latest successfully mutated document in typed recovery and retain the pre-revision checkpoint for explicit Undo. Do not automatically restore it.
- Review limit: return the latest render without blocking export.

## Fakes required for independent work

Implement local fakes for:

- Stateless `DocumentPort`
- `PdfPort`
- Model responses
- Workflow event recorder

Use canned plans, tool calls, rendered pages, and visual reviews so orchestration can be completed before Teammate A's renderer exists.

## Acceptance checks

- Context is rebuilt without old tool traces.
- The planner returns a validated ID-free plan.
- The tool surface contains exactly six tools.
- Tool mutations only call `DocumentPort`.
- Invalid structured output triggers one repair attempt.
- Unknown visual node IDs normalize to `null`.
- All PDF pages are included in review.
- Every issue goes to the revision agent; no auto-fix path exists.
- The loop performs no more than three reviews.
- A failed vision call still returns the current valid render.
- Cancellation prevents later model/tool steps.
- Workflow events contain stages, not chain-of-thought.

## Required public barrel

Expose from `src/agent/index.ts`:

```ts
createAgent(
  dependencies: AgentRuntimeDependencies,
  configuration: OllamaConfiguration,
): AgentPort
```

Expose `createModelDiagnosticPort(configuration): ModelDiagnosticPort` from `src/ollama/index.ts`, plus only the configuration APIs needed by composition. Expose from `src/review/index.ts` only review normalization/testing helpers needed outside the module.

## Handoff to integration

Provide Teammate C with:

- `createAgent`
- Typed success and recovery-error behavior
- Ollama configuration builder
- `createModelDiagnosticPort`
- Model health/warm-up behavior required by diagnostics

B's fake `AgentPort` remains private to B's tests. C uses its own temporary fake during parallel work.

Provide Teammate A with no implementation dependency. Consume A exclusively through `DocumentPort` and `PdfPort` from the shared contracts.
