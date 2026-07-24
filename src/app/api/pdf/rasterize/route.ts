import { z } from "zod";
import { documentIdSchema } from "@/contracts";
import { base64ToBlob } from "@/lib/base64";
import { createPdfPort } from "@/pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const rasterizeRequestSchema = z
  .object({
    documentId: documentIdSchema,
    documentVersion: z.number().int().nonnegative(),
    pageCount: z.number().int().positive().optional(),
    pdfBase64: z.string().min(1),
    renderedAt: z.string().datetime().optional(),
  })
  .strict();

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = rasterizeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        {
          code: "INVALID_NODE",
          message: "Invalid rasterize payload.",
          details: parsed.error.format(),
        },
        { status: 400 },
      );
    }

    const pdfBlob = base64ToBlob(parsed.data.pdfBase64, "application/pdf");
    const port = createPdfPort();
    const result = await port.rasterize(
      {
        documentId: parsed.data.documentId,
        documentVersion: parsed.data.documentVersion,
        pdfBlob,
        pageCount: parsed.data.pageCount ?? 1,
        renderedAt: parsed.data.renderedAt ?? new Date().toISOString(),
      },
      request.signal,
    );

    if (!result.success) {
      return Response.json(result.error, {
        status:
          result.error.code === "ABORTED"
            ? 499
            : result.error.code === "RASTERIZATION_FAILED"
              ? 501
              : 500,
      });
    }

    return Response.json({ pages: result.data });
  } catch (error) {
    return Response.json(
      {
        code: "RASTERIZATION_FAILED",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
