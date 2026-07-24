"use client";

import { useSession } from "@/components/app-shell/session-context";

export function ReferenceChips() {
  const { referenceImages, removeReference, actionsDisabled } = useSession();

  if (referenceImages.length === 0) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {referenceImages.map((image) => (
        <div
          key={image.id}
          className="group flex items-center gap-2 rounded-full border border-border bg-surface py-1 pr-1 pl-1"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.dataUrl}
            alt=""
            className="size-7 rounded-full object-cover"
          />
          <span className="max-w-[8rem] truncate text-xs text-muted">
            {image.name}
          </span>
          <button
            type="button"
            aria-label={`Remove ${image.name}`}
            disabled={actionsDisabled}
            onClick={() => removeReference(image.id)}
            className="flex size-6 items-center justify-center rounded-full text-muted-dim transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-40"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
