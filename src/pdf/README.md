# PDF Pipeline (A6–A8)

This module implements the headless PDF pipeline used by backend agents. It focuses on deterministic PDF generation and provides primitives that UI agents can call to render, rasterize, and export documents. The UI is intentionally out of scope — this README explains integration points.

Public API (via `createPdfPort()`)

- `render(document: DocumentState, signal?) -> AppResult<InternalRenderResult>`
  - Produces an in-memory PDF `Blob` and metadata (`pageCount`, `renderedAt`).
  - Validates `DocumentState` before rendering where appropriate.
  - Supports abort via `AbortSignal` (best-effort).

- `rasterize(render: InternalRenderResult, signal?) -> AppResult<RasterizedPage[]>`
  - Converts a PDF Blob to per-page PNG Data URLs and extracts per-page text.
  - Not implemented yet; placeholder for Phase 3.

- `export(document, existingRender?, signal?) -> AppResult<ExportResult>`
  - High level export that reuses existing render where possible and returns a sanitized filename and PDF blob. Placeholder for Phase 4.

Integration notes for UI/Agent developers

- How to render
  1. Call `createPdfPort().render(document)`.
  2. On success you receive `{ documentId, documentVersion, pdfBlob, pageCount, renderedAt }`.
  3. To download in the browser, use `URL.createObjectURL(pdfBlob)` or convert to `ArrayBuffer`.

- How to rasterize (future)
  1. Pass the `InternalRenderResult` to `rasterize()`.
  2. Receive an array of `RasterizedPage` objects containing per-page PNG Data URLs and dimensions.

- How to export (future)
  1. Call `export(document, existingRender)`.
  2. If `existingRender` matches the document id and version, the implementation should reuse it instead of re-rendering.

Design constraints

- No UI code lives here — these modules must be usable in Node and serverless runtimes.
- All public functions return `AppResult<T>` with structured errors.
- Keep render deterministic: same `DocumentState` → identical PDF output.

Next steps for implementer integrating UI

- Phase 1: Use `render()` to obtain PDF blob and display via object URL.
- Phase 2: When rasterize() is available, use it to show per-page thumbnails.
- Phase 3: Use `export()` for server-side downloads and filename generation.
