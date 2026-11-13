"use client";

import { useState } from "react";
import { Info, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getOcrEntryForImageRef } from "@/lib/image-ocr-map";
import { cn } from "@/lib/utils";

function OcrMetadataBody({ entry }) {
  const [copied, setCopied] = useState(false);

  const copyAll = async () => {
    const payload = entry.latin
      ? `${entry.text}\n\n— Roman search text —\n${entry.latin}`
      : entry.text;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      toast.success("OCR text copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          OCR from image
        </p>
        <button
          type="button"
          onClick={copyAll}
          className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-muted"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          Copy
        </button>
      </div>
      <p className="max-h-48 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {entry.text}
      </p>
      {entry.latin ? (
        <div className="border-t border-border/60 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Searchable in English
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{entry.latin}</p>
        </div>
      ) : null}
    </div>
  );
}

/** OCR metadata popover (fullscreen viewer only). Caller should render only when OCR exists. */
export function ImageOcrInfoButton({ imageRef, imageOcrMap, className, size = "sm" }) {
  const entry = getOcrEntryForImageRef(imageOcrMap, imageRef);
  if (!entry?.text) return null;

  const sizeClass = size === "md" ? "h-8 w-8" : "h-6 w-6";
  const iconClass = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
          aria-label="View OCR text from this image"
          className={cn(
            "flex items-center justify-center rounded-full bg-black/55 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-black/75",
            sizeClass,
            className
          )}
        >
          <Info className={iconClass} strokeWidth={2.25} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[2147483647] w-[min(100vw-2rem,22rem)] p-4"
        side="top"
        align="end"
        onClick={e => e.stopPropagation()}
        onOpenAutoFocus={e => e.preventDefault()}
      >
        <OcrMetadataBody entry={entry} />
      </PopoverContent>
    </Popover>
  );
}
