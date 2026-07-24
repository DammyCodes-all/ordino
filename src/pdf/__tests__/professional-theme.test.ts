import { describe, it, expect } from "vitest";
import {
  spacingMap,
  emphasisStyle,
  THEME,
  resolveHeadingStyle,
  resolveParagraphStyle,
  resolveListNodeStyle,
  resolveTableStyle,
  resolveQuoteStyle,
  resolveCalloutStyle,
  resolveDividerStyle,
} from "../professional-theme";

describe("professional-theme", () => {
  describe("spacingMap", () => {
    it("maps all spacing tokens to numbers", () => {
      expect(spacingMap.none).toBe(0);
      expect(spacingMap.xs).toBe(4);
      expect(spacingMap.sm).toBe(8);
      expect(spacingMap.md).toBe(16);
      expect(spacingMap.lg).toBe(24);
    });
  });

  describe("emphasisStyle", () => {
    it("maps normal to empty", () => {
      expect(emphasisStyle.normal).toEqual({});
    });
    it("maps bold to fontWeight 700", () => {
      expect(emphasisStyle.bold).toEqual({ fontWeight: 700 });
    });
    it("maps italic to fontStyle italic", () => {
      expect(emphasisStyle.italic).toEqual({ fontStyle: "italic" });
    });
  });

  describe("THEME constants", () => {
    it("has valid page size", () => {
      expect(THEME.PAGE_SIZE).toBe("A4");
    });
    it("has positive margins", () => {
      expect(THEME.MARGIN.top).toBeGreaterThan(0);
      expect(THEME.MARGIN.bottom).toBeGreaterThan(0);
      expect(THEME.MARGIN.left).toBeGreaterThan(0);
      expect(THEME.MARGIN.right).toBeGreaterThan(0);
    });
    it("has font sizes hierarchy", () => {
      expect(THEME.FONT_SIZES.h1).toBeGreaterThan(THEME.FONT_SIZES.h2);
      expect(THEME.FONT_SIZES.h2).toBeGreaterThan(THEME.FONT_SIZES.h3);
      expect(THEME.FONT_SIZES.h3).toBeGreaterThan(THEME.FONT_SIZES.body);
    });
    it("has line heights", () => {
      expect(THEME.LINE_HEIGHT.tight).toBeLessThan(THEME.LINE_HEIGHT.normal);
      expect(THEME.LINE_HEIGHT.normal).toBeLessThan(THEME.LINE_HEIGHT.loose);
    });
  });

  describe("resolveHeadingStyle", () => {
    const baseStyle = {
      spaceBefore: "md" as const,
      spaceAfter: "sm" as const,
      alignment: "left" as const,
      keepWithNext: false,
    };

    it("resolves level 1 with correct fontSize", () => {
      const s = resolveHeadingStyle(1, baseStyle) as any;
      expect(s.fontSize).toBe(THEME.FONT_SIZES.h1);
      expect(s.fontWeight).toBe(700);
      expect(s.marginTop).toBe(spacingMap.md);
      expect(s.marginBottom).toBe(spacingMap.sm);
    });

    it("resolves level 2 with smaller fontSize", () => {
      const s = resolveHeadingStyle(2, baseStyle) as any;
      expect(s.fontSize).toBe(THEME.FONT_SIZES.h2);
    });

    it("resolves level 3 with smallest heading fontSize", () => {
      const s = resolveHeadingStyle(3, baseStyle) as any;
      expect(s.fontSize).toBe(THEME.FONT_SIZES.h3);
    });
  });

  describe("resolveParagraphStyle", () => {
    it("applies emphasis from style", () => {
      const s = resolveParagraphStyle({
        spaceBefore: "none",
        spaceAfter: "md",
        alignment: "justify",
        emphasis: "bold",
      }) as any;
      expect(s.fontWeight).toBe(700);
      expect(s.textAlign).toBe("justify");
    });

    it("applies italic emphasis", () => {
      const s = resolveParagraphStyle({
        spaceBefore: "none",
        spaceAfter: "md",
        alignment: "left",
        emphasis: "italic",
      }) as any;
      expect(s.fontStyle).toBe("italic");
    });
  });

  describe("resolveListNodeStyle", () => {
    it("applies compact line height", () => {
      const s = resolveListNodeStyle({
        spaceBefore: "sm",
        spaceAfter: "sm",
        compact: true,
      }) as any;
      expect(s.lineHeight).toBe(THEME.LINE_HEIGHT.tight);
    });

    it("applies normal line height when not compact", () => {
      const s = resolveListNodeStyle({
        spaceBefore: "sm",
        spaceAfter: "sm",
        compact: false,
      }) as any;
      expect(s.lineHeight).toBe(THEME.LINE_HEIGHT.normal);
    });
  });

  describe("resolveQuoteStyle", () => {
    it("includes italic and border", () => {
      const s = resolveQuoteStyle({
        spaceBefore: "sm",
        spaceAfter: "sm",
        alignment: "left",
      }) as any;
      expect(s.fontStyle).toBe("italic");
      expect(s.borderLeftWidth).toBe(2);
    });
  });

  describe("resolveCalloutStyle", () => {
    it("note variant uses blue bg", () => {
      const s = resolveCalloutStyle({
        spaceBefore: "sm",
        spaceAfter: "sm",
        variant: "note",
      }) as any;
      expect(s.backgroundColor).toBe(THEME.COLORS.calloutNote);
      expect(s.borderLeftColor).toBe(THEME.COLORS.calloutNoteBorder);
    });

    it("warning variant uses red bg", () => {
      const s = resolveCalloutStyle({
        spaceBefore: "sm",
        spaceAfter: "sm",
        variant: "warning",
      }) as any;
      expect(s.backgroundColor).toBe(THEME.COLORS.calloutWarning);
    });

    it("highlight variant uses yellow bg", () => {
      const s = resolveCalloutStyle({
        spaceBefore: "sm",
        spaceAfter: "sm",
        variant: "highlight",
      }) as any;
      expect(s.backgroundColor).toBe(THEME.COLORS.calloutHighlight);
    });
  });

  describe("resolveDividerStyle", () => {
    it("applies spacing", () => {
      const s = resolveDividerStyle({
        spaceBefore: "lg",
        spaceAfter: "lg",
        variant: "solid",
      }) as any;
      expect(s.marginTop).toBe(spacingMap.lg);
      expect(s.marginBottom).toBe(spacingMap.lg);
    });
  });
});
