import { pdfAnalysisRequestSchema } from "@/contracts";
import { runPdfAnalysisModel } from "@/pdf-analysis/analyze-model";
import {
  buildPdfAnalysisSystemPrompt,
  buildPdfAnalysisUserPrompt,
} from "@/pdf-analysis/prompt";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = pdfAnalysisRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        {
          success: false,
          error: {
            code: "INVALID_MODEL_OUTPUT",
            message: "Invalid PDF analysis request.",
            retryable: false,
            details: parsed.error.format(),
          },
        },
        { status: 400 },
      );
    }

    // Soft payload guard — reject extremely large image batches.
    const imageChars = parsed.data.pages.reduce(
      (sum, page) => sum + page.imageDataUrl.length,
      0,
    );
    if (imageChars > 12_000_000) {
      return Response.json(
        {
          success: false,
          error: {
            code: "MODEL_REQUEST_FAILED",
            message: "Analysis payload too large. Analyze fewer pages.",
            retryable: false,
          },
        },
        { status: 413 },
      );
    }

    const result = await runPdfAnalysisModel(
      parsed.data,
      buildPdfAnalysisSystemPrompt(),
      buildPdfAnalysisUserPrompt(parsed.data),
      request.signal,
    );

    if (!result.success) {
      const status =
        result.error.code === "MISSING_API_KEY"
          ? 503
          : result.error.code === "MODEL_AUTH_FAILED"
            ? 401
            : result.error.code === "MODEL_RATE_LIMITED"
              ? 429
              : 500;
      return Response.json(result, { status });
    }

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: {
          code: "MODEL_REQUEST_FAILED",
          message:
            error instanceof Error ? error.message : "PDF analysis failed.",
          retryable: true,
        },
      },
      { status: 500 },
    );
  }
}
