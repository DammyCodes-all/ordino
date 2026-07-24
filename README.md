# Ordino — AI-Driven PDF Document Authoring & Visual Review System

Ordino is an agentic, cloud-assisted document authoring platform built with **Next.js 16 (Turbopack)**, **Google AI Studio (`@ai-sdk/google`)**, **React PDF**, and **Zod**.

It translates high-level chat prompts and image references into structured, multi-page professional PDF documents through a closed-loop generation, rendering, deterministic validation, visual inspection, and multi-pass revision cycle.

---

## Key Features

- 🧠 **Structured AI Orchestration**: Multi-pass turn loop using Gemini on Google AI Studio for planning, writing, visual review, and tool-driven revisions.
- 🛠️ **6 Stateless Document Tools**: `addNode`, `editNode`, `moveNode`, `deleteNode`, `readNode`, and `finalizeDocument` operating over deterministic Zod-validated state.
- 👁️ **Visual Review Loop**: Automated multi-page PDF rasterization and AI vision review (up to 3 iterations) identifying visual hierarchy, page overflow, and spacing issues.
- 🛡️ **Privacy & Cloud Transfer Disclosures**: All document/PDF processing and IndexedDB persistence remain local in the browser. AI Studio calls execute exclusively via server-side same-origin route handlers (`src/app/api/ai/**`), keeping `GOOGLE_GENERATIVE_AI_API_KEY` safe and out of client bundles.
- ⚡ **Local PDF Rendering & Export**: Fast client/server PDF generation via React PDF with instant local export capabilities.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **AI / LLM**: `@ai-sdk/google`, AI SDK 7 (`ai`)
- **PDF Engine**: `@react-pdf/renderer`, `pdfjs-dist`
- **Validation & Schemas**: `zod`
- **Testing & Quality**: Vitest, Biome

---

## Architecture & Workstream Division

Ordino enforces strict modular ownership:

| Area | Path | Focus |
|---|---|---|
| **Contracts** | `src/contracts/**` | Shared Zod schemas, IDs, types, errors, and port interfaces |
| **Document & PDF** | `src/document/**`, `src/pdf/**` | Document AST mutations, deterministic validation, React PDF rendering & rasterization |
| **AI Agent & Review** | `src/agent/**`, `src/google-ai/**`, `src/review/**`, `src/app/api/ai/**` | Model gateways, prompt context builder, tool executor, visual reviewer, and orchestration loop |
| **UI & Persistence** | `src/app/**`, `src/components/**`, `src/storage/**` | Chat interface, document previewer, IndexedDB session storage |

---

## Getting Started

### 1. Prerequisites

- Node.js 20+
- `pnpm` package manager

### 2. Environment Setup

Copy `.env.example` to `.env.local` and provide your Google AI Studio API key:

```bash
cp .env.example .env.local
```

In `.env.local`:
```env
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_studio_api_key_here
GOOGLE_GENERATIVE_AI_MODEL=gemma-4-31b-it
```

> ⚠️ **Important**: `GOOGLE_GENERATIVE_AI_API_KEY` is a server-only environment variable. Never expose it with a `NEXT_PUBLIC_` prefix.

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Scripts & Testing

- `pnpm dev`: Start Next.js development server
- `pnpm build`: Build production web app with Turbopack & TypeScript check
- `pnpm start`: Run production server
- `pnpm test`: Execute test suite using Vitest
- `pnpm lint`: Run Biome linter
- `pnpm typecheck`: Run TypeScript compiler check

---
