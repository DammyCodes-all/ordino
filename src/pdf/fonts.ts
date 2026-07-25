import { Font } from "@react-pdf/renderer";
import type { DocumentState } from "../contracts/document";

const registeredFonts = new Set<string>();

export function registerFont(family: string, src: string): void {
  const key = `${family}:${src}`;
  if (registeredFonts.has(key)) return;
  try {
    Font.register({ family, src });
    registeredFonts.add(key);
  } catch {
    // Non-fatal: renderer will fallback to default fonts
  }
}

export function registerFontsFromDocument(document: DocumentState): void {
  const families = new Set<string>();
  for (const node of document.nodes) {
    if ("style" in node && node.style && "fontFamily" in node.style) {
      const ff = (node.style as Record<string, unknown>).fontFamily;
      if (typeof ff === "string" && ff.length > 0) {
        families.add(ff);
      }
    }
  }
  for (const family of families) {
    registerFont(family, `fonts/${family}-Regular.ttf`);
  }
}

export function registerDefaultFonts(): void {
  // Rely on built-in fonts where possible; explicit registration can be added.
  // Example for custom font registration:
  // Font.register({ family: 'Inter', src: path.join(__dirname, 'fonts/Inter-Regular.ttf') })
  // Keep this function idempotent.
}

export default registerDefaultFonts;
