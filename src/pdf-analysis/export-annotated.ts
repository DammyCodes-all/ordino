import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type {
  AnalysisDocument,
  AppResult,
  DocumentHighlight,
} from "@/contracts";
import { createErrorResult, createSuccessResult } from "@/google-ai";

const KIND_COLORS: Record<string, [number, number, number]> = {
  deadline: [0.95, 0.55, 0.15],
  money: [0.2, 0.65, 0.35],
  signature: [0.35, 0.4, 0.9],
  obligation: [0.55, 0.35, 0.75],
  risk: [0.9, 0.25, 0.25],
  right: [0.15, 0.55, 0.75],
  termination: [0.75, 0.2, 0.45],
  required_action: [0.9, 0.7, 0.1],
  other: [0.5, 0.5, 0.5],
};

export async function exportAnnotatedPdf(
  sourcePdf: Blob,
  analysis: AnalysisDocument,
  highlights: DocumentHighlight[],
  options?: { includeAppendix?: boolean },
): Promise<AppResult<{ blob: Blob; filename: string }>> {
  try {
    const bytes = await sourcePdf.arrayBuffer();
    const pdfDoc = await PDFDocument.load(bytes);
    const pages = pdfDoc.getPages();
    const pageByNumber = new Map(
      analysis.pages.map((page) => [page.pageNumber, page]),
    );

    for (const highlight of highlights) {
      const color = KIND_COLORS[highlight.kind] ?? KIND_COLORS.other;
      for (const box of highlight.boundingBoxes) {
        const page = pages[box.pageNumber - 1];
        const analysisPage = pageByNumber.get(box.pageNumber);
        if (!page || !analysisPage) continue;

        const { width, height } = page.getSize();
        const scaleX = width / analysisPage.widthPx;
        const scaleY = height / analysisPage.heightPx;
        const w = Math.max(2, box.width * scaleX);
        const h = Math.max(2, box.height * scaleY);
        const x = box.x * scaleX;
        const y = height - (box.y + box.height) * scaleY;

        page.drawRectangle({
          x,
          y,
          width: w,
          height: h,
          color: rgb(color[0], color[1], color[2]),
          opacity: 0.28,
          borderColor: rgb(color[0], color[1], color[2]),
          borderOpacity: 0.7,
          borderWidth: 1,
        });
      }
    }

    if (options?.includeAppendix !== false && highlights.length > 0) {
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      let appendix = pdfDoc.addPage();
      let { width, height } = appendix.getSize();
      let y = height - 48;
      const write = (text: string, size = 11, useBold = false) => {
        const lines = wrapText(text, useBold ? bold : font, size, width - 72);
        for (const line of lines) {
          if (y < 48) {
            appendix = pdfDoc.addPage();
            ({ width, height } = appendix.getSize());
            y = height - 48;
          }
          appendix.drawText(line, {
            x: 36,
            y,
            size,
            font: useBold ? bold : font,
            color: rgb(0.15, 0.12, 0.1),
          });
          y -= size + 4;
        }
        y -= 6;
      };

      write("Analysis appendix", 16, true);
      write("Informational only — not legal or financial advice.", 10);
      for (const highlight of highlights) {
        write(
          `p.${highlight.pageNumber} · ${highlight.kind} · ${highlight.severity}`,
          12,
          true,
        );
        write(`Source: ${highlight.sourceText}`);
        write(`Explanation: ${highlight.plainLanguageText}`);
        write(`Translation: ${highlight.translatedText}`);
      }
    }

    const out = await pdfDoc.save();
    const base = analysis.fileName.replace(/\.pdf$/i, "") || "document";
    const filename =
      analysis.origin === "ordino_generated_pdf"
        ? `${base}-analysis.pdf`
        : `${base}-annotated.pdf`;

    return createSuccessResult({
      blob: new Blob([out.buffer as ArrayBuffer], { type: "application/pdf" }),
      filename,
    });
  } catch (error) {
    return createErrorResult(
      "EXPORT_FAILED",
      error instanceof Error ? error.message : "Annotated export failed.",
      true,
    );
  }
}

function wrapText(
  text: string,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}
