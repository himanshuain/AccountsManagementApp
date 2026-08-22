"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PhotoInputPill } from "./PhotoInputPill";

export function ChatInputBar({
  placeholder = "Enter amount...",
  inputValue = "",
  onInputChange,
  onSubmit,
  disabled = false,
  className,
  children,
  maxImages = 5,
  submitLabel = "Add transaction",
}) {
  const [attachments, setAttachments] = useState([]);

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30",
        "bg-background/95 backdrop-blur-sm",
        "px-4 pt-2 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]",
        "lg:static lg:bg-transparent lg:p-0",
        className
      )}
    >
      {children && <div className="mb-2 flex items-center gap-2 px-1">{children}</div>}

      <PhotoInputPill
        placeholder={placeholder}
        inputValue={inputValue}
        onInputChange={onInputChange}
        onSubmit={onSubmit}
        disabled={disabled}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
        maxImages={maxImages}
        inputMode="numeric"
        submitLabel={submitLabel}
      />
    </div>
  );
}
