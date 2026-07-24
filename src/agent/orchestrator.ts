import type {
  AgentPort,
  AgentTurnInput,
  AgentTurnOutput,
  AgentTurnError,
  AgentRuntimeDependencies,
  GoogleAIConfiguration,
  AppResult,
  DocumentState,
  DocumentCheckpoint,
  InternalRenderResult,
  ValidationReport,
  VisualReviewResult,
  WorkflowEvent,
  NodeId,
} from "@/contracts";
import { GoogleAIClient, createSuccessResult, createErrorResult, mapErrorToAppError } from "@/google-ai";
import { planDocument } from "./planner";
import { ToolExecutor } from "./tool-executor";
import { runVisualReview } from "@/review";
import { prepareReviewCheckpoint } from "@/review/revision-context";
import { runWriterLoop, runRevisionLoop } from "./writer";

export class AgentOrchestrator implements AgentPort {
  private client: GoogleAIClient;

  constructor(
    private dependencies: AgentRuntimeDependencies,
    private configuration: GoogleAIConfiguration,
  ) {
    this.client = new GoogleAIClient(configuration);
  }

  private emit(stage: WorkflowEvent["stage"], message: string, level: WorkflowEvent["level"] = "info") {
    this.dependencies.onEvent({
      stage,
      message,
      level,
      createdAt: new Date().toISOString(),
    });
  }

  private checkAborted(signal?: AbortSignal, currentDoc?: DocumentState, checkpoints?: DocumentCheckpoint[], lastRender?: InternalRenderResult | null) {
    if (signal?.aborted) {
      const err = new Error("Turn was aborted by user");
      (err as any).isAbortError = true;
      (err as any).recovery = {
        document: currentDoc!,
        createdCheckpoints: checkpoints ?? [],
        lastValidRender: lastRender ?? null,
      };
      throw err;
    }
  }

  async runTurn(input: AgentTurnInput): Promise<AppResult<AgentTurnOutput, AgentTurnError>> {
    let currentDoc = input.document;
    const createdCheckpoints: DocumentCheckpoint[] = [];
    let lastValidRender: InternalRenderResult | null = null;
    let reviewIterations: 0 | 1 | 2 | 3 = 0;

    try {
      this.checkAborted(input.signal, currentDoc, createdCheckpoints, lastValidRender);

      const isInitialGen = currentDoc.nodes.length === 0;
      let documentPlan: import("@/contracts").DocumentPlan | null = null;

      // 1. Planning (if initial generation)
      if (isInitialGen) {
        this.emit("planning", "Starting document planning");
        const planRes = await planDocument(this.client, input, this.dependencies.document);
        if (!planRes.success) {
          return createErrorResult(
            planRes.error.code,
            planRes.error.message,
            planRes.error.retryable,
            { recovery: { document: currentDoc, createdCheckpoints, lastValidRender } },
          ) as any;
        }
        documentPlan = planRes.data;
        this.checkAborted(input.signal, currentDoc, createdCheckpoints, lastValidRender);
      } else {
        // Create user_turn checkpoint before first follow-up mutation
        const userTurnRes = this.dependencies.document.createCheckpoint(currentDoc, "user_turn");
        if (userTurnRes.success) {
          createdCheckpoints.push(userTurnRes.data.checkpoint);
          currentDoc = userTurnRes.data.document;
        }
      }

      // 2. Generating (Writer loop)
      this.emit("generating", "Generating document content");
      const toolExec = new ToolExecutor(this.dependencies.document);

      const writerResult = await runWriterLoop(
        this.client,
        currentDoc,
        documentPlan ?? {
          summary: "Continue writing the document.",
          sections: [{ heading: "Content", purpose: "Continue existing content", estimatedParagraphs: 1, includeTable: false, includeList: false }],
        },
        toolExec,
        input.userMessage,
        input.signal,
      );

      if (!writerResult.success) {
        return createErrorResult(
          writerResult.error.code,
          writerResult.error.message,
          writerResult.error.retryable,
          { recovery: { document: currentDoc, createdCheckpoints, lastValidRender } },
        ) as any;
      }
      currentDoc = writerResult.data.document;

      this.checkAborted(input.signal, currentDoc, createdCheckpoints, lastValidRender);

      // Review Loop (Max 3 iterations)
      let finalValidation: ValidationReport = { documentVersion: currentDoc.version, pass: true, issues: [] };
      let finalVisualReview: VisualReviewResult | null = null;

      while (reviewIterations < 3) {
        // 3. Rendering
        this.emit("rendering", `Rendering document version ${currentDoc.version}`);
        const renderRes = await this.dependencies.pdf.render(currentDoc, input.signal);
        if (!renderRes.success) {
          // Failure to render
          return createErrorResult(
            renderRes.error.code,
            renderRes.error.message,
            renderRes.error.retryable,
            { recovery: { document: currentDoc, createdCheckpoints, lastValidRender } },
          ) as any;
        }
        lastValidRender = renderRes.data;
        this.checkAborted(input.signal, currentDoc, createdCheckpoints, lastValidRender);

        // 4. Validating
        this.emit("validating", "Running deterministic validation");
        const docVal = this.dependencies.validateDocument(currentDoc);
        const pdfVal = await this.dependencies.validatePdf(currentDoc, lastValidRender);
        finalValidation = {
          documentVersion: currentDoc.version,
          pass: docVal.pass && pdfVal.pass,
          issues: [...docVal.issues, ...pdfVal.issues],
        };
        this.checkAborted(input.signal, currentDoc, createdCheckpoints, lastValidRender);

        // 5. Rasterizing
        this.emit("rasterizing", "Rasterizing rendered pages for review");
        const rasterRes = await this.dependencies.pdf.rasterize(lastValidRender, input.signal);
        if (!rasterRes.success) {
          // If rasterization fails, stop review loop and return valid render
          break;
        }
        const rasterizedPages = rasterRes.data;
        this.checkAborted(input.signal, currentDoc, createdCheckpoints, lastValidRender);

        // 6. Reviewing
        this.emit("reviewing", "Running visual review");
        const outline = this.dependencies.document.outline(currentDoc);
        const reviewRes = await runVisualReview(
          this.client,
          rasterizedPages,
          outline,
          currentDoc.meta,
          finalValidation.issues,
          input.signal,
        );

        if (!reviewRes.success) {
          // Vision review failure preserves render and returns visualReview: null
          finalVisualReview = null;
          break;
        }

        finalVisualReview = {
          ...reviewRes.data,
          documentVersion: currentDoc.version,
        };
        this.checkAborted(input.signal, currentDoc, createdCheckpoints, lastValidRender);

        // Check pass condition
        if (finalValidation.pass && finalVisualReview.pass) {
          break; // Loop completed successfully!
        }

        // 7. Revising
        reviewIterations++;
        if (reviewIterations >= 3) {
          break; // Maximum iterations reached
        }

        this.emit("revising", `Executing revision pass ${reviewIterations}`);
        const prep = await prepareReviewCheckpoint(currentDoc, this.dependencies.document);
        if (prep) {
          createdCheckpoints.push(prep.checkpoint);
          currentDoc = prep.nextDocument;
        }

        const revisionResult = await runRevisionLoop(
          this.client,
          currentDoc,
          finalValidation.issues,
          finalVisualReview?.issues ?? [],
          toolExec,
          input.signal,
        );
        if (revisionResult.success) {
          currentDoc = revisionResult.data.document;
        }
        this.checkAborted(input.signal, currentDoc, createdCheckpoints, lastValidRender);
      }

      this.emit("finalizing", "Finalizing agent turn");

      const exportRes = await this.dependencies.pdf.export(currentDoc, lastValidRender ?? undefined, input.signal);
      const exportResult = exportRes.success ? exportRes.data : null;

      this.emit("ready", "Turn completed successfully");

      return createSuccessResult({
        document: currentDoc,
        createdCheckpoints,
        finalRender: lastValidRender!,
        exportResult,
        validation: finalValidation,
        visualReview: finalVisualReview,
        reviewIterations: reviewIterations as 0 | 1 | 2 | 3,
        assistantMessage: `I've updated “${currentDoc.meta.title || "your document"}”. Open the preview to review it, or tell me what to change.`,
      });
    } catch (err: any) {
      if (err?.isAbortError) {
        return createErrorResult("ABORTED", "Turn was aborted by user", false, {
          recovery: err.recovery,
        }) as any;
      }
      return createErrorResult("MODEL_REQUEST_FAILED", err?.message || String(err), true, {
        recovery: {
          document: currentDoc,
          createdCheckpoints,
          lastValidRender,
        },
      }) as any;
    }
  }
}

export function createAgent(
  dependencies: AgentRuntimeDependencies,
  configuration: GoogleAIConfiguration,
): AgentPort {
  return new AgentOrchestrator(dependencies, configuration);
}
