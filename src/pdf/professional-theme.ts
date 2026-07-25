import type {
  CalloutStyle,
  DividerStyle,
  HeadingStyle,
  ListStyle,
  ParagraphStyle,
  QuoteStyle,
  TableStyle,
} from "../contracts/document";

type SpacingToken = "none" | "xs" | "sm" | "md" | "lg";
type Alignment = "left" | "center" | "right" | "justify";
type Emphasis = "normal" | "bold" | "italic";

export const spacingMap: Record<SpacingToken, number> = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
};

export const emphasisStyle: Record<
  Emphasis,
  { fontStyle?: "normal" | "italic"; fontWeight?: number }
> = {
  normal: {},
  bold: { fontWeight: 700 },
  italic: { fontStyle: "italic" },
};

export const THEME = {
  PAGE_SIZE: "A4" as const,
  MARGIN: { top: 60, bottom: 72, left: 56, right: 56 },
  FONT_SIZES: {
    title: 24,
    h1: 20,
    h2: 16,
    h3: 14,
    body: 11,
    small: 9,
  },
  LINE_HEIGHT: {
    tight: 1.2,
    normal: 1.5,
    loose: 1.8,
  },
  COLORS: {
    text: "#1a1a1a",
    muted: "#666666",
    border: "#cccccc",
    accent: "#2563eb",
    bg: "#f8fafc",
    calloutNote: "#eff6ff",
    calloutHighlight: "#fef3c7",
    calloutWarning: "#fef2f2",
    calloutNoteBorder: "#3b82f6",
    calloutHighlightBorder: "#f59e0b",
    calloutWarningBorder: "#ef4444",
    tableHeaderBg: "#f1f5f9",
    tableStripeBg: "#f8fafc",
  },
  PAGE_NUMBER_STYLE: {
    fontSize: 9,
    color: "#999999",
    textAlign: "center" as const,
  },
  FOOTER_STYLE: {
    fontSize: 8,
    color: "#bbbbbb",
    textAlign: "center" as const,
  },
  TABLE: {
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
    headerBorderWidth: 1,
  },
  QUOTE: {
    borderWidth: 2,
    borderColor: "#cbd5e1",
    paddingLeft: 12,
  },
  DIVIDER: {
    height: 1,
    color: "#e2e8f0",
    subtleColor: "#f1f5f9",
  },
} as const;

export function resolveHeadingStyle(
  level: 1 | 2 | 3,
  style: HeadingStyle,
): Record<string, unknown> {
  const sizeMap = {
    1: THEME.FONT_SIZES.h1,
    2: THEME.FONT_SIZES.h2,
    3: THEME.FONT_SIZES.h3,
  };
  return {
    fontSize: style.fontSize ?? sizeMap[level],
    fontWeight: 700,
    fontFamily: style.fontFamily,
    color: style.color ?? THEME.COLORS.text,
    marginTop: spacingMap[style.spaceBefore],
    marginBottom: spacingMap[style.spaceAfter],
    textAlign: style.alignment,
    lineHeight: THEME.LINE_HEIGHT.tight,
  };
}

export function resolveParagraphStyle(
  style: ParagraphStyle,
): Record<string, unknown> {
  return {
    fontSize: style.fontSize ?? THEME.FONT_SIZES.body,
    fontFamily: style.fontFamily,
    color: style.color ?? THEME.COLORS.text,
    marginTop: spacingMap[style.spaceBefore],
    marginBottom: spacingMap[style.spaceAfter],
    textAlign: style.alignment,
    lineHeight: THEME.LINE_HEIGHT.normal,
    ...emphasisStyle[style.emphasis],
  };
}

export function resolveListNodeStyle(
  style: ListStyle,
): Record<string, unknown> {
  return {
    fontSize: THEME.FONT_SIZES.body,
    fontFamily: style.fontFamily,
    color: style.color ?? THEME.COLORS.text,
    marginTop: spacingMap[style.spaceBefore],
    marginBottom: spacingMap[style.spaceAfter],
    lineHeight: style.compact
      ? THEME.LINE_HEIGHT.tight
      : THEME.LINE_HEIGHT.normal,
  };
}

export function resolveTableStyle(style: TableStyle): Record<string, unknown> {
  return {
    fontSize: THEME.FONT_SIZES.body,
    fontFamily: style.fontFamily,
    color: style.color ?? THEME.COLORS.text,
    marginTop: spacingMap[style.spaceBefore],
    marginBottom: spacingMap[style.spaceAfter],
  };
}

export function resolveQuoteStyle(style: QuoteStyle): Record<string, unknown> {
  return {
    fontSize: THEME.FONT_SIZES.body,
    fontFamily: style.fontFamily,
    color: style.color ?? THEME.COLORS.muted,
    marginTop: spacingMap[style.spaceBefore],
    marginBottom: spacingMap[style.spaceAfter],
    textAlign: style.alignment,
    fontStyle: "italic" as const,
    lineHeight: THEME.LINE_HEIGHT.normal,
    borderLeftWidth: THEME.QUOTE.borderWidth,
    borderLeftColor: THEME.QUOTE.borderColor,
    paddingLeft: THEME.QUOTE.paddingLeft,
  };
}

export function resolveCalloutStyle(
  style: CalloutStyle,
): Record<string, unknown> {
  const variantMap = {
    note: {
      bg: THEME.COLORS.calloutNote,
      border: THEME.COLORS.calloutNoteBorder,
    },
    highlight: {
      bg: THEME.COLORS.calloutHighlight,
      border: THEME.COLORS.calloutHighlightBorder,
    },
    warning: {
      bg: THEME.COLORS.calloutWarning,
      border: THEME.COLORS.calloutWarningBorder,
    },
  };
  const v = variantMap[style.variant];
  return {
    fontSize: THEME.FONT_SIZES.body,
    fontFamily: style.fontFamily,
    color: style.color ?? THEME.COLORS.text,
    marginTop: spacingMap[style.spaceBefore],
    marginBottom: spacingMap[style.spaceAfter],
    backgroundColor: v.bg,
    borderLeftWidth: 3,
    borderLeftColor: v.border,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 8,
    paddingBottom: 8,
    lineHeight: THEME.LINE_HEIGHT.normal,
  };
}

export function resolveDividerStyle(
  style: DividerStyle,
): Record<string, unknown> {
  return {
    marginTop: spacingMap[style.spaceBefore],
    marginBottom: spacingMap[style.spaceAfter],
    color: style.color,
    variant: style.variant,
  };
}

export function resolvePageSize(pageSize?: string): "A4" | "LETTER" | "LEGAL" {
  const map: Record<string, "A4" | "LETTER" | "LEGAL"> = {
    letter: "LETTER",
    a4: "A4",
    legal: "LEGAL",
  };
  return map[pageSize ?? "a4"] ?? "A4";
}

export interface PageMargin {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export function resolveMargins(margin?: {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}): PageMargin {
  if (!margin) return { ...THEME.MARGIN };
  return {
    top: margin.top ?? THEME.MARGIN.top,
    bottom: margin.bottom ?? THEME.MARGIN.bottom,
    left: margin.left ?? THEME.MARGIN.left,
    right: margin.right ?? THEME.MARGIN.right,
  };
}
