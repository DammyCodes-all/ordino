"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { useSession } from "@/components/app-shell/session-context";
import { AppIcon } from "@/components/ui/app-icon";

export function ReferenceChips() {
  const { referenceImages, removeReference, actionsDisabled } = useSession();

  if (referenceImages.length === 0) return null;

  return (
    <div className="mb-1.5 flex flex-wrap gap-1.5">
      {referenceImages.map((image) => (
        <div
          key={image.id}
          className="group flex items-center gap-1.5 rounded-full border border-border bg-surface/80 py-0.5 pr-0.5 pl-0.5 backdrop-blur-sm"
        >
          {/* biome-ignore lint/performance/noImgElement: data-URL thumbnails */}
          <img
            src={image.dataUrl}
            alt=""
            className="size-6 rounded-full object-cover"
          />
          <span className="max-w-[8rem] truncate text-xs text-muted">
            {image.name}
          </span>
          <button
            type="button"
            aria-label={`Remove ${image.name}`}
            disabled={actionsDisabled}
            onClick={() => removeReference(image.id)}
            className="flex size-5 items-center justify-center rounded-full text-muted-dim transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-40"
          >
            <AppIcon icon={Cancel01Icon} size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
