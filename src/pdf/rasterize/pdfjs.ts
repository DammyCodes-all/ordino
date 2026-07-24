import type {
  InternalRenderResult,
  RasterizedPage,
} from "../../contracts/rendering";

declare const require: (id: string) => any;

// pdfjs legacy build has no TS declarations in this environment
const pdfjs: any = require("pdfjs-dist/legacy/build/pdf.js");

if (pdfjs?.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = "";
}

export async function rasterizePdf(
  render: InternalRenderResult,
  signal?: AbortSignal,
): Promise<
  { success: true; data: RasterizedPage[] } | { success: false; error: any }
> {
  try {
    const arrayBuffer = await render.pdfBlob.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    const loadingTask = pdfjs.getDocument({ data: uint8 });
    const pdf = await loadingTask.promise;

    const pages: RasterizedPage[] = [];
    const pageTexts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      if (signal?.aborted)
        return {
          success: false,
          error: {
            code: "ABORTED",
            message: "Rasterization aborted",
            retryable: false,
          },
        };

      const page = await pdf.getPage(i);

      try {
        const textContent = await page.getTextContent();
        const text = textContent.items
          .map((item: { str?: string }) => item.str ?? "")
          .join(" ");
        pageTexts.push(text);
      } catch {
        pageTexts.push("");
      }

      const scale = 2;
      const viewport = page.getViewport({ scale });

      let createCanvas: any;
      try {
        createCanvas = require("canvas").createCanvas;
      } catch {
        return {
          success: false,
          error: {
            code: "RASTERIZATION_FAILED",
            message: "canvas module not available in this environment",
            retryable: false,
          },
        };
      }

      const canvas = createCanvas(
        Math.ceil(viewport.width),
        Math.ceil(viewport.height),
      );
      const ctx = canvas.getContext("2d");

      await page.render({ canvasContext: ctx as any, viewport }).promise;

      const pngBuffer = canvas.toBuffer("image/png");
      const dataUrl = `data:image/png;base64,${pngBuffer.toString("base64")}`;

      pages.push({
        documentVersion: render.documentVersion,
        pageNumber: i,
        mimeType: "image/png",
        dataUrl,
        widthPx: canvas.width,
        heightPx: canvas.height,
      });
    }

    render.pageTexts = pageTexts;

    return { success: true, data: pages };
  } catch (err: unknown) {
    return {
      success: false,
      error: {
        code: "RASTERIZATION_FAILED",
        message: err instanceof Error ? err.message : String(err),
        retryable: false,
      },
    };
  }
}

export default rasterizePdf;
