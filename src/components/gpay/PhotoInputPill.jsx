"use client";

import { useRef, useState } from "react";
import { Plus, Camera, Image as ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { haptics } from "@/hooks/useHaptics";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PhotoGalleryViewer } from "@/components/PhotoViewer";

function createAttachment(file) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url: URL.createObjectURL(file),
    file,
    name: file.name,
    size: file.size,
  };
}

export function PhotoInputPill({
  placeholder = "Enter amount...",
  inputValue = "",
  onInputChange,
  onSubmit,
  disabled = false,
  className,
  attachments = [],
  onAttachmentsChange,
  maxImages = 5,
  inputMode = "text",
  submitLabel = "Add transaction",
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const canAddMore = attachments.length < maxImages;
  const showSend = inputValue.trim() || attachments.length > 0;

  const addFiles = files => {
    if (!files.length || !onAttachmentsChange) return;

    const remaining = maxImages - attachments.length;
    const toAdd = files.slice(0, remaining).map(createAttachment);
    if (!toAdd.length) return;

    onAttachmentsChange([...attachments, ...toAdd]);
    setMenuOpen(false);
  };

  const handleFileSelect = e => {
    const files = Array.from(e.target.files || []);
    addFiles(files);
    e.target.value = "";
  };

  const removeAttachment = id => {
    if (!onAttachmentsChange) return;

    const removed = attachments.find(item => item.id === id);
    if (removed?.url?.startsWith("blob:")) {
      URL.revokeObjectURL(removed.url);
    }

    onAttachmentsChange(attachments.filter(item => item.id !== id));
  };

  const handleSubmit = () => {
    if ((!inputValue.trim() && attachments.length === 0) || disabled) return;

    haptics.light();
    onSubmit?.(inputValue, attachments);
    onInputChange?.("");
    attachments.forEach(item => {
      if (item.url?.startsWith("blob:")) URL.revokeObjectURL(item.url);
    });
    onAttachmentsChange?.([]);
  };

  const openViewer = index => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const isNumericInput = inputMode === "decimal" || inputMode === "numeric";

  const handleInputChange = raw => {
    if (!isNumericInput) {
      onInputChange?.(raw);
      return;
    }
    // Digits only — positive whole numbers (no minus, decimals, or letters)
    onInputChange?.(raw.replace(/\D/g, ""));
  };

  return (
    <>
      <div
        className={cn(
          "flex flex-col rounded-[22px] bg-muted/50 px-1.5 py-1",
          "border border-border/50 shadow-sm",
          className
        )}
      >
        {attachments.length > 0 && (
          <div className="carousel-edge-fade flex gap-2 overflow-x-auto px-1 pb-1 pt-2 scrollbar-none">
            {attachments.map((item, index) => (
              <div key={item.id} className="relative h-24 w-24 shrink-0">
                <button
                  type="button"
                  aria-label={`View photo ${index + 1}`}
                  onClick={() => openViewer(index)}
                  className="h-full w-full overflow-hidden rounded-2xl bg-muted shadow-sm ring-1 ring-black/[0.1] outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring dark:ring-white/[0.1]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt="" className="h-full w-full object-cover" />
                </button>
                {!disabled && (
                  <button
                    type="button"
                    aria-label={`Remove photo ${index + 1}`}
                    onClick={() => removeAttachment(item.id)}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-neutral-900/90 text-white shadow-md"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 px-0.5">
          {!disabled && canAddMore && (
            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-full text-muted-foreground bg-muted hover:text-foreground"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="start"
                className="w-56 rounded-2xl p-2 shadow-xl"
                sideOffset={12}
              >
                <div className="flex flex-col gap-1">
                  <MenuButton
                    icon={Camera}
                    label="Camera"
                    onClick={() => {
                      setMenuOpen(false);
                      cameraInputRef.current?.click();
                    }}
                  />
                  <MenuButton
                    icon={ImageIcon}
                    label="Photos"
                    onClick={() => {
                      setMenuOpen(false);
                      galleryInputRef.current?.click();
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>
          )}

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex min-h-[36px] flex-1 items-center">
            <textarea
              value={inputValue}
              onChange={e => {
                handleInputChange(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`;
              }}
              placeholder={placeholder}
              disabled={disabled}
              inputMode={isNumericInput ? "numeric" : inputMode}
              pattern={isNumericInput ? "[0-9]*" : undefined}
              className="max-h-[96px] w-full resize-none bg-transparent py-1.5 text-[15px] leading-snug outline-none placeholder:text-muted-foreground"
              rows={1}
              onKeyDown={e => {
                if (
                  isNumericInput &&
                  (e.key === "-" ||
                    e.key === "+" ||
                    e.key === "e" ||
                    e.key === "E" ||
                    e.key === ".")
                ) {
                  e.preventDefault();
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>

          {showSend && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={disabled}
              className="shrink-0 rounded-full bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-orange-600 active:scale-[0.97] disabled:opacity-50"
            >
              {submitLabel}
            </button>
          )}
        </div>
      </div>

      <PhotoGalleryViewer
        images={attachments.map(item => item.url)}
        initialIndex={viewerIndex}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </>
  );
}

function MenuButton({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-muted"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted-foreground/10">
        <Icon className="h-4 w-4" />
      </div>
      {label}
    </button>
  );
}
