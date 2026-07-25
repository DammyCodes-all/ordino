import { Font } from "@react-pdf/renderer";
import path from "path";
import type { DocumentState } from "../contracts/document";

const registeredFamilies = new Set<string>();

interface FontRegistration {
  family: string;
  src: string;
  weight: number;
  style?: "normal" | "italic";
}

function register(reg: FontRegistration): void {
  const key = `${reg.family}:${reg.weight}:${reg.style ?? "normal"}`;
  if (registeredFamilies.has(key)) return;
  try {
    Font.register({
      family: reg.family,
      src: reg.src,
      fontWeight: reg.weight,
      fontStyle: reg.style ?? "normal",
    });
    registeredFamilies.add(key);
  } catch (err) {
    console.warn(
      `Font "${reg.family}" (${reg.weight}${reg.style ?? ""}) could not be registered:`,
      err instanceof Error ? err.message : String(err),
    );
  }
}

function registerFontFile(
  family: string,
  filename: string,
  weight: number,
  style?: "normal" | "italic",
): void {
  const src = path.join(__dirname, "fonts", filename);
  register({ family, src, weight, style });
}

export function registerDefaultFonts(): void {
  if (registeredFamilies.size > 0) return;

  registerFontFile("Inter", "Inter-Regular.ttf", 400);
  registerFontFile("Inter", "Inter-Bold.ttf", 700);
  registerFontFile("Merriweather", "Merriweather-Regular.ttf", 400);
  registerFontFile("Merriweather", "Merriweather-Bold.ttf", 700);
}

export function registerFontsFromDocument(document: DocumentState): void {
  const families = new Set<{
    family: string;
    weight: number;
    style?: "normal" | "italic";
  }>();
  for (const node of document.nodes) {
    if ("style" in node && node.style && "fontFamily" in node.style) {
      const ff = (node.style as Record<string, unknown>).fontFamily;
      if (typeof ff === "string" && ff.length > 0) {
        if (/[/.\\]/.test(ff)) {
          console.warn(
            `Skipping font "${ff}": name contains invalid characters`,
          );
          continue;
        }
        families.add({ family: ff, weight: 400 });
        families.add({ family: ff, weight: 700 });
      }
    }
  }
  for (const { family, weight, style } of families) {
    const base = family.replace(/\s+/g, "");
    const filename = `${base}-${style === "italic" ? "Italic" : "Regular"}.ttf`;
    registerFontFile(family, filename, weight, style);
  }
}
