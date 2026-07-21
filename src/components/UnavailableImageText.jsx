"use client";

import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Inline text for a bill/photo that failed to load (no placeholder box).
 */
export function UnavailableImageText({
  label = "Photo",
  index,
  total,
  allCount,
  className,
  hint = "Re-attach when editing",
}) {
  let message;
  if (allCount != null) {
    message =
      allCount === 1
        ? `${label} unavailable`
        : `All ${allCount} ${label.toLowerCase()}s unavailable`;
  } else {
    const name =
      total != null && total > 1 && index != null ? `${label} ${index + 1}` : label;
    message = `${name} unavailable`;
  }

  return (
    <p className={cn("flex items-start gap-1.5 text-xs leading-snug text-muted-foreground", className)}>
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
      <span>
        {message}
        {hint ? ` — ${hint}` : ""}
      </span>
    </p>
  );
}

export default UnavailableImageText;
