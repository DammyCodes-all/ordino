"use client";

import type { DocumentHighlight } from "@/contracts";

const KIND_CLASS: Record<string, string> = {
  deadline: "bg-warning/35 border-warning",
  money: "bg-success/30 border-success",
  signature: "bg-accent-soft border-accent",
  obligation: "bg-accent-soft border-accent-dim",
  risk: "bg-danger/25 border-danger",
  right: "bg-accent-soft border-accent",
  termination: "bg-danger/20 border-danger",
  required_action: "bg-warning/30 border-warning",
  other: "bg-muted/20 border-border",
};

export function HighlightOverlay({
  highlights,
  pageNumber,
  pageWidth,
  pageHeight,
  selectedId,
  onSelect,
}: {
  highlights: DocumentHighlight[];
  pageNumber: number;
  pageWidth: number;
  pageHeight: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const pageHighlights = highlights.filter(
    (highlight) =>
      highlight.pageNumber === pageNumber && highlight.boundingBoxes.length > 0,
  );

  return (
    <div className="pointer-events-none absolute inset-0">
      {pageHighlights.flatMap((highlight) =>
        highlight.boundingBoxes.map((box, index) => {
          const left = (box.x / pageWidth) * 100;
          const top = (box.y / pageHeight) * 100;
          const width = (box.width / pageWidth) * 100;
          const height = (box.height / pageHeight) * 100;
          const selected = highlight.id === selectedId;
          return (
            <button
              key={`${highlight.id}-${index}`}
              type="button"
              className={`pointer-events-auto absolute rounded-sm border-2 transition-opacity ${
                KIND_CLASS[highlight.kind] ?? KIND_CLASS.other
              } ${selected ? "opacity-100 ring-2 ring-accent" : "opacity-70 hover:opacity-100"}`}
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${Math.max(width, 0.8)}%`,
                height: `${Math.max(height, 0.6)}%`,
              }}
              title={highlight.plainLanguageText}
              onClick={() => onSelect(highlight.id)}
            />
          );
        }),
      )}
    </div>
  );
}
