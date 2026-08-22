"use client";

import { useRef, useState } from "react";
import { Plus, Camera, Image as ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PhotoGalleryViewer } from "@/components/PhotoViewer";
import { resolveImageUrl } from "@/lib/image-url";

function isLocalImage(url) {
  return typeof url === "string" && (url.startsWith("blob:") || url.startsWith("data:"));
}

function displayUrl(url) {
  if (!url) return "";
  if (isLocalImage(url)) return url;
  return resolveImageUrl(url);
}

export function FormPhotoStrip({
  images = [],
  pendingFiles = [],
  onChange,
  maxImages = 5,
  disabled = false,
  uploadHint = "uploads on save",
}) {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const canAddMore = images.length < maxImages && !disabled;

  const addFiles = files => {
    if (!files.length || !onChange) return;
    const remaining = maxImages - images.length;
    const toAdd = files.slice(0, remaining);
    if (!toAdd.length) return;

    onChange({
      images: [...images, ...toAdd.map(file => URL.createObjectURL(file))],
      pendingFiles: [...pendingFiles, ...toAdd],
    });
    setMenuOpen(false);
  };

  const removeAt = index => {
    if (!onChange) return;

    const url = images[index];
    let pendingIdx = 0;
    for (let i = 0; i < index; i++) {
      if (isLocalImage(images[i])) pendingIdx++;
    }

    if (url?.startsWith("blob:")) URL.revokeObjectURL(url);

    onChange({
      images: images.filter((_, i) => i !== index),
      pendingFiles: isLocalImage(url)
        ? pendingFiles.filter((_, i) => i !== pendingIdx)
        : pendingFiles,
    });
  };

  return (
    <>
      <div className="flex gap-2.5 overflow-x-auto pb-0.5 pt-2.5 scrollbar-none">
        {images.map((url, index) => (
          <div key={`${url}-${index}`} className="relative h-20 w-20 shrink-0">
            <button
              type="button"
              aria-label={`View photo ${index + 1}`}
              onClick={() => {
                setViewerIndex(index);
                setViewerOpen(true);
              }}
              className="h-full w-full overflow-hidden rounded-2xl border border-border/60 bg-muted shadow-sm outline-none transition-transform active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={displayUrl(url)} alt="" className="h-full w-full object-cover" />
            </button>
            {!disabled && (
              <button
                type="button"
                aria-label={`Remove photo ${index + 1}`}
                onClick={() => removeAt(index)}
                className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-neutral-900/90 text-white shadow-lg"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}

        {canAddMore && (
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Add photo"
                className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border bg-muted/20 text-muted-foreground transition-colors hover:border-border/80 hover:bg-muted/40 hover:text-foreground"
              >
                <Plus className="h-6 w-6" />
                <span className="text-[10px] font-medium">Add</span>
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-52 rounded-2xl p-2" sideOffset={8}>
              <div className="flex flex-col gap-1">
                <MenuButton
                  icon={Camera}
                  label="Camera"
                  onClick={() => {
                    setMenuOpen(false);
                    cameraRef.current?.click();
                  }}
                />
                <MenuButton
                  icon={ImageIcon}
                  label="Photos"
                  onClick={() => {
                    setMenuOpen(false);
                    galleryRef.current?.click();
                  }}
                />
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {images.length} of {maxImages}
        {pendingFiles.length > 0 ? ` · ${uploadHint}` : images.length > 0 ? " · tap to view" : ""}
      </p>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={e => {
          addFiles(Array.from(e.target.files || []));
          e.target.value = "";
        }}
        className="hidden"
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        onChange={e => {
          addFiles(Array.from(e.target.files || []));
          e.target.value = "";
        }}
        className="hidden"
      />

      <PhotoGalleryViewer
        images={images.map(displayUrl)}
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
