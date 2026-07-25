import type {
  AgentPort,
  AgentRuntimeDependencies,
  AgentTurnError,
  AgentTurnInput,
  AgentTurnOutput,
  AppResult,
  DocumentCheckpoint,
  DocumentState,
  GoogleAIConfiguration,
  InternalRenderResult,
  ValidationReport,
  VisualReviewResult,
  WorkflowEvent,
} from "@/contracts";
import {
  createErrorResult,
  createSuccessResult,
  GoogleAIClient,
} from "@/google-ai";
import { runVisualReview } from "@/review";
import { prepareReviewCheckpoint } from "@/review/revision-context";
import { planDocument } from "./planner";
import { ToolExecutor } from "./tool-executor";
import { runBatchWriterLoop, runRevisionLoop } from "./writer";

export class AgentOrchestrator implements AgentPort {
  private client: GoogleAIClient;

  constructor(
    private dependencies: AgentRuntimeDependencies,
    private configuration: GoogleAIConfiguration,
  ) {
    this.client = new GoogleAIClient(configuration);
  }

  private emit(
    stage: WorkflowEvent["stage"],
    message: string,
    level: WorkflowEvent["level"] = "info",
  ) {
    this.dependencies.onEvent({
      stage,
      message,
      level,
      createdAt: new Date().toISOString(),
    });
  }

  private narrate(text: string) {
    this.dependencies.onThinking?.(text);
  }

  private checkAborted(
    signal?: AbortSignal,
    currentDoc?: DocumentState,
    checkpoints?: DocumentCheckpoint[],
    lastRender?: InternalRenderResult | null,
  ) {
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

  async runTurn(
    input: AgentTurnInput,
  ): Promise<AppResult<AgentTurnOutput, AgentTurnError>> {
    let currentDoc = input.document;
    const createdCheckpoints: DocumentCheckpoint[] = [];
    let lastValidRender: InternalRenderResult | null = null;
    let reviewIterations: 0 | 1 = 0;

    try {
      this.checkAborted(
        input.signal,
        currentDoc,
        createdCheckpoints,
        lastValidRender,
      );

      const isInitialGen = currentDoc.nodes.length === 0;
      let documentPlan: import("@/contracts").DocumentPlan | null = null;

      // 1. Planning (if initial generation)
      if (isInitialGen) {
        this.emit("planning", "Planning document structure (1 model call)…");
        this.narrate("Planning a document structure based on your request…");
        const planRes = await planDocument(
          this.client,
          input,
          this.dependencies.document,
        );
        if (!planRes.success) {
          return createErrorResult(
            planRes.error.code,
            planRes.error.message,
            planRes.error.retryable,
            {
              recovery: {
                document: currentDoc,
                createdCheckpoints,
                lastValidRender,
              },
            },
          ) as any;
        }
        documentPlan = planRes.data;
        const sectionNames = documentPlan.sections
          .map((s) => s.heading)
          .join(", ");
        this.narrate(
          `Plan ready: ${documentPlan.sections.length} sections — ${sectionNames}`,
        );
        this.emit(
          "planning",
          `Plan ready: ${documentPlan.sections.length} section${documentPlan.sections.length === 1 ? "" : "s"} — ${documentPlan.summary.slice(0, 120)}`,
        );
        this.checkAborted(
          input.signal,
          currentDoc,
          createdCheckpoints,
          lastValidRender,
        );
      } else {
        // Create user_turn checkpoint before first follow-up mutation
        const userTurnRes = this.dependencies.document.createCheckpoint(
          currentDoc,
          "user_turn",
        );
        if (userTurnRes.success) {
          createdCheckpoints.push(userTurnRes.data.checkpoint);
          currentDoc = userTurnRes.data.document;
        }
      }

      // 2. Generating (Writer loop)
      this.emit("generating", "Writing document content…");
      this.narrate("Writing the document content…");
      const toolExec = new ToolExecutor(this.dependencies.document);

      const writerResult = await runBatchWriterLoop(
        this.client,
        currentDoc,
        documentPlan ?? {
          summary: input.userMessage,
          sections: [
            {
              heading: "User request",
              purpose: input.userMessage,
              estimatedParagraphs: 1,
              includeTable: false,
              includeList: false,
            },
          ],
        },
        toolExec,
        input.userMessage,
        input.signal,
        (message) => this.emit("generating", message),
        this.dependencies.onThinking,
        this.dependencies.onToolCall,
        input.conversation,
        this.dependencies.document,
      );

      if (!writerResult.success) {
        return createErrorResult(
          writerResult.error.code,
          writerResult.error.message,
          writerResult.error.retryable,
          {
            recovery: {
              document: currentDoc,
              createdCheckpoints,
              lastValidRender,
            },
          },
        ) as any;
      }
      currentDoc = writerResult.data.document;

      this.checkAborted(
        input.signal,
        currentDoc,
        createdCheckpoints,
        lastValidRender,
      );

      // Review Loop (Max 1 iteration)
      let finalValidation: ValidationReport = {
        documentVersion: currentDoc.version,
        pass: true,
        issues: [],
      };
      let finalVisualReview: VisualReviewResult | null = null;

      while (reviewIterations < 1) {
        // 3. Rendering
        this.emit(
          "rendering",
          `Rendering document version ${currentDoc.version}`,
        );
        this.narrate("Content complete — rendering the PDF…");
        const renderRes = await this.dependencies.pdf.render(
          currentDoc,
          input.signal,
        );
        if (!renderRes.success) {
          this.narrate("PDF rendering failed.");
          return createErrorResult(
            renderRes.error.code,
            renderRes.error.message,
            renderRes.error.retryable,
            {
              recovery: {
                document: currentDoc,
                createdCheckpoints,
                lastValidRender,
              },
            },
          ) as any;
        }
        lastValidRender = renderRes.data;
        this.narrate("PDF rendered successfully.");
        this.checkAborted(
          input.signal,
          currentDoc,
          createdCheckpoints,
          lastValidRender,
        );

        // 4. Validating
        this.emit("validating", "Running deterministic validation");
        this.narrate("Checking document structure…");
        const docVal = this.dependencies.validateDocument(currentDoc);
        const pdfVal = await this.dependencies.validatePdf(
          currentDoc,
          lastValidRender,
        );
        finalValidation = {
          documentVersion: currentDoc.version,
          pass: docVal.pass && pdfVal.pass,
          issues: [...docVal.issues, ...pdfVal.issues],
        };
        if (finalValidation.pass) {
          this.narrate("All structural checks passed.");
        } else {
          this.narrate(
            `Found ${finalValidation.issues.length} issue${finalValidation.issues.length === 1 ? "" : "s"} during validation.`,
          );
        }
        this.checkAborted(
          input.signal,
          currentDoc,
          createdCheckpoints,
          lastValidRender,
        );

        // 5. Rasterizing
        this.emit("rasterizing", "Rasterizing rendered pages for review");
        this.narrate("Converting pages to images for visual review…");
        const rasterRes = await this.dependencies.pdf.rasterize(
          lastValidRender,
          input.signal,
        );
        if (!rasterRes.success) {
          this.narrate(
            "Page image generation skipped — visual review will be unavailable.",
          );
          this.emit(
            "rasterizing",
            "Rasterization failed — skipping visual review",
            "warning",
          );
          break;
        }
        const rasterizedPages = rasterRes.data;
        this.checkAborted(
          input.signal,
          currentDoc,
          createdCheckpoints,
          lastValidRender,
        );

        // 6. Reviewing
        this.emit("reviewing", "Running visual review");
        this.narrate("AI reviewing layout, typography, and spacing…");
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
          this.narrate(
            "Visual review skipped — continuing with validation results only.",
          );
          this.emit(
            "reviewing",
            "Visual review failed — continuing without it",
            "warning",
          );
          finalVisualReview = null;
          break;
        }

        finalVisualReview = {
          ...reviewRes.data,
          documentVersion: currentDoc.version,
        };
        if (finalVisualReview.pass) {
          this.narrate("Visual review passed — no layout issues found.");
        } else {
          this.narrate(
            `Visual review found ${finalVisualReview.issues.length} issue${finalVisualReview.issues.length === 1 ? "" : "s"}.`,
          );
        }
        this.checkAborted(
          input.signal,
          currentDoc,
          createdCheckpoints,
          lastValidRender,
        );

        // Check pass condition
        if (finalValidation.pass && finalVisualReview.pass) {
          break; // Loop completed successfully!
        }

        // 7. Revising
        this.emit(
          "revising",
          `Executing revision pass ${reviewIterations + 1}`,
        );
        this.narrate(
          `Revision pass ${reviewIterations + 1}: fixing identified issues…`,
        );
        const prep = await prepareReviewCheckpoint(
          currentDoc,
          this.dependencies.document,
        );
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
          (message) => this.emit("revising", message),
          this.dependencies.onThinking,
          this.dependencies.onToolCall,
        );
        if (revisionResult.success) {
          currentDoc = revisionResult.data.document;
          this.narrate("Revision complete.");
        } else {
          this.narrate(
            "Revision step failed — continuing with current version.",
          );
          this.emit("revising", "Revision loop failed", "warning");
        }

        reviewIterations++;
        if (reviewIterations >= 1) {
          this.narrate(
            "Reached maximum revision passes — delivering best version.",
          );
          break;
        }

        this.checkAborted(
          input.signal,
          currentDoc,
          createdCheckpoints,
          lastValidRender,
        );
      }

      this.emit("finalizing", "Finalizing agent turn");
      this.narrate("Finalizing document…");

      const exportRes = await this.dependencies.pdf.export(
        currentDoc,
        lastValidRender ?? undefined,
        input.signal,
      );
      const exportResult = exportRes.success ? exportRes.data : null;
      if (!exportRes.success) {
        this.narrate(
          "PDF export encountered an issue — preview is still available.",
        );
        this.emit("finalizing", "Export failed — preview available", "warning");
      }

      this.emit("ready", "Turn completed successfully");
      this.narrate("All done.");

      return createSuccessResult({
        document: currentDoc,
        createdCheckpoints,
        finalRender: lastValidRender!,
        exportResult,
        validation: finalValidation,
        visualReview: finalVisualReview,
        reviewIterations: reviewIterations as 0 | 1,
        assistantMessage: `I've updated “${currentDoc.meta.title || "your document"}”. Open the preview to review it, or tell me what to change.`,
      });
    } catch (err: any) {
      if (err?.isAbortError) {
        return createErrorResult("ABORTED", "Turn was aborted by user", false, {
          recovery: err.recovery,
        }) as any;
      }
      return createErrorResult(
        "MODEL_REQUEST_FAILED",
        err?.message || String(err),
        true,
        {
          recovery: {
            document: currentDoc,
            createdCheckpoints,
            lastValidRender,
          },
        },
      ) as any;
    }
  }
}

export function createAgent(
  dependencies: AgentRuntimeDependencies,
  configuration: GoogleAIConfiguration,
): AgentPort {
  return new AgentOrchestrator(dependencies, configuration);
}
