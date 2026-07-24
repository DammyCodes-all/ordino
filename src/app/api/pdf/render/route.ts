import { documentStateSchema } from "@/contracts";
import { blobToBase64 } from "@/lib/base64";
import { createPdfPort } from "@/pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = documentStateSchema.safeParse(body.document ?? body);
    if (!parsed.success) {
      return Response.json(
        {
          code: "INVALID_NODE",
          message: "Invalid document payload.",
          details: parsed.error.format(),
        },
        { status: 400 },
      );
    }

    const port = createPdfPort();
    const result = await port.render(parsed.data, request.signal);
    if (!result.success) {
      return Response.json(result.error, {
        status: result.error.code === "ABORTED" ? 499 : 500,
      });
    }

    const pdfBase64 = await blobToBase64(result.data.pdfBlob);
    return Response.json({
      documentId: result.data.documentId,
      documentVersion: result.data.documentVersion,
      pageCount: result.data.pageCount,
      renderedAt: result.data.renderedAt,
      pdfBase64,
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
