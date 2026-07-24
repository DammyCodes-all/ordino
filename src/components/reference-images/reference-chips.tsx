"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { useSession } from "@/components/app-shell/session-context";
import { AppIcon } from "@/components/ui/app-icon";

export function ReferenceChips() {
  const { referenceImages, removeReference, actionsDisabled } = useSession();

  if (referenceImages.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {referenceImages.map((image) => (
        <div
          key={image.id}
          className="group flex items-center gap-2 rounded-full border border-border bg-surface/80 py-1 pr-1 pl-1 backdrop-blur-sm"
        >
          {/* biome-ignore lint/performance/noImgElement: data-URL thumbnails */}
          <img
            src={image.dataUrl}
            alt=""
            className="size-8 rounded-full object-cover"
          />
          <span className="max-w-[10rem] truncate text-sm text-muted">
            {image.name}
          </span>
          <button
            type="button"
            aria-label={`Remove ${image.name}`}
            disabled={actionsDisabled}
            onClick={() => removeReference(image.id)}
            className="flex size-7 items-center justify-center rounded-full text-muted-dim transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-40"
          >
            <AppIcon icon={Cancel01Icon} size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
