import { z } from "zod";
import { documentIdSchema, documentStateSchema } from "@/contracts";
import { base64ToBlob, blobToBase64 } from "@/lib/base64";
import { createPdfPort } from "@/pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const exportRequestSchema = z
  .object({
    document: documentStateSchema,
    existingRender: z
      .object({
        documentId: documentIdSchema,
        documentVersion: z.number().int().nonnegative(),
        pageCount: z.number().int().positive(),
        renderedAt: z.string().datetime(),
        pdfBase64: z.string().min(1),
      })
      .strict()
      .optional(),
  })
  .strict();

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = exportRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        {
          code: "INVALID_NODE",
          message: "Invalid export payload.",
          details: parsed.error.format(),
        },
        { status: 400 },
      );
    }

    const existing = parsed.data.existingRender
      ? {
          documentId: parsed.data.existingRender.documentId,
          documentVersion: parsed.data.existingRender.documentVersion,
          pdfBlob: base64ToBlob(
            parsed.data.existingRender.pdfBase64,
            "application/pdf",
          ),
          pageCount: parsed.data.existingRender.pageCount,
          renderedAt: parsed.data.existingRender.renderedAt,
        }
      : undefined;

    const port = createPdfPort();
    const result = await port.export(
      parsed.data.document,
      existing,
      request.signal,
    );

    if (!result.success) {
      return Response.json(result.error, { status: 500 });
    }

    return Response.json({
      documentId: result.data.documentId,
      documentVersion: result.data.documentVersion,
      filename: result.data.filename,
      pdfBase64: await blobToBase64(result.data.blob),
    });
  } catch (error) {
    return Response.json(
      {
        code: "RENDER_FAILED",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
