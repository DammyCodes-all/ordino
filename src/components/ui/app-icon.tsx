"use client";

import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";

type AppIconProps = {
  icon: IconSvgElement;
  size?: number;
  strokeWidth?: number;
  className?: string;
  title?: string;
};

export function AppIcon({
  icon,
  size = 16,
  strokeWidth = 1.75,
  className,
  title,
}: AppIconProps) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden={title ? undefined : true}
      {...(title ? { "aria-label": title } : {})}
    />
  );
}
