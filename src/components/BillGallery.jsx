"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { X, User, Calendar, IndianRupee, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getOptimizedImageUrl, resolveImageUrl } from "@/lib/imagekit";
import { getImageSizeBytes, formatBytes } from "@/lib/image-size";
import { useProgressiveList, LoadMoreTrigger } from "@/hooks/useProgressiveList";
import { PROGRESSIVE_LOAD } from "@/lib/constants";

export function BillGallery({ transactions, suppliers }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [imageErrors, setImageErrors] = useState({});
  const [selectedSizeLabel, setSelectedSizeLabel] = useState("");

  // Touch handling refs
  const touchStartRef = useRef({ x: 0, y: 0, distance: 0 });
  const imageContainerRef = useRef(null);
  const lastTapRef = useRef(0);

  // Flatten all bills from all transactions - memoized to avoid recalculation
  const allBills = useMemo(() => {
    const bills = [];
    transactions.forEach(transaction => {
      if (transaction.billImages && transaction.billImages.length > 0) {
        transaction.billImages.forEach((imageUrl, index) => {
          if (imageUrl) {
            bills.push({
              url: imageUrl,
              transaction: transaction,
              supplier: suppliers.find(s => s.id === transaction.supplierId),
              index: index,
            });
          }
        });
      }
    });
    return bills;
  }, [transactions, suppliers]);

  // Progressive loading - configurable via constants
  const {
    visibleItems: visibleBills,
    hasMore,
    loadMore,
    loadMoreRef,
    remainingCount,
    totalCount,
  } = useProgressiveList(
    allBills,
    PROGRESSIVE_LOAD.BILL_GALLERY_INITIAL,
    PROGRESSIVE_LOAD.BILL_GALLERY_BATCH
  );

  const currentIndex = allBills.findIndex(b => b.url === selectedImage);

  const openLightbox = bill => {
    setSelectedImage(resolveImageUrl(bill.url));
    setSelectedTransaction(bill.transaction);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const closeLightbox = () => {
    setSelectedImage(null);
    setSelectedTransaction(null);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setSelectedSizeLabel("");
  };

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prevBill = allBills[currentIndex - 1];
      setSelectedImage(resolveImageUrl(prevBill.url));
      setSelectedTransaction(prevBill.transaction);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [currentIndex, allBills]);

  const goToNext = useCallback(() => {
    if (currentIndex < allBills.length - 1) {
      const nextBill = allBills[currentIndex + 1];
      setSelectedImage(resolveImageUrl(nextBill.url));
      setSelectedTransaction(nextBill.transaction);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [currentIndex, allBills]);

  // Touch handlers for swipe and pinch zoom
  const handleTouchStart = e => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        distance: 0,
      };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartRef.current.distance = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handleTouchMove = e => {
    if (e.touches.length === 2) {
      // Pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const scale = distance / touchStartRef.current.distance;

      setZoom(prev => {
        const newZoom = prev * scale;
        return Math.min(Math.max(newZoom, 0.5), 4);
      });
      touchStartRef.current.distance = distance;
    }
  };

  const handleTouchEnd = e => {
    if (e.changedTouches.length === 1 && zoom === 1) {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = endX - touchStartRef.current.x;
      const diffY = endY - touchStartRef.current.y;

      // Check for double tap to zoom
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        setZoom(prev => (prev === 1 ? 2 : 1));
        setPosition({ x: 0, y: 0 });
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      // Swipe detection (only if not zoomed)
      if (Math.abs(diffX) > 50 && Math.abs(diffY) < 100) {
        if (diffX > 0) {
          goToPrevious();
        } else {
          goToNext();
        }
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = e => {
      if (!selectedImage) return;

      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImage, goToPrevious, goToNext]);

  useEffect(() => {
    let isActive = true;
    setSelectedSizeLabel("");
    if (!selectedImage) return;

    getImageSizeBytes(selectedImage, { allowDownload: true }).then(bytes => {
      if (!isActive) return;
      const label = bytes ? formatBytes(bytes) : "";
      setSelectedSizeLabel(label);
    });

    return () => {
      isActive = false;
    };
  }, [selectedImage]);

  const getSupplierName = supplierId => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.companyName || supplier?.name || "Unknown";
  };

  const paymentStatusColors = {
    paid: "bg-green-500/20 text-green-400",
    pending: "bg-amber-500/20 text-amber-400",
    partial: "bg-blue-500/20 text-blue-400",
  };

  const handleImageError = billId => {
    setImageErrors(prev => ({ ...prev, [billId]: true }));
  };

  if (allBills.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <ImageIcon className="mx-auto mb-3 h-12 w-12 opacity-50" />
        <p>No bill images uploaded yet</p>
        <p className="mt-1 text-sm">Upload bills when adding transactions</p>
      </div>
    );
  }

  return (
    <>
      {/* Gallery Grid - Progressive Loading */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {visibleBills.map(bill => {
          const billId = `${bill.transaction.id}-${bill.index}`;
          const hasError = imageErrors[billId];

          return (
            <Card
              key={billId}
              className="cursor-pointer overflow-hidden transition-all hover:ring-2 hover:ring-primary"
              onClick={() => !hasError && openLightbox(bill)}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                {hasError ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                ) : (
                  <OptimizedBillThumbnail
                    url={bill.url}
                    alt={`Bill from ${getSupplierName(bill.transaction.supplierId)}`}
                    onError={() => handleImageError(billId)}
                  />
                )}
              </div>
              {/* Info always visible */}
              <div className="border-t bg-card p-2">
                <p className="truncate text-xs font-medium">
                  {getSupplierName(bill.transaction.supplierId)}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    ₹{bill.transaction.amount?.toLocaleString()}
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "px-1.5 py-0 text-[10px]",
                      bill.transaction.paymentStatus === "paid"
                        ? "text-green-600"
                        : "text-amber-600"
                    )}
                  >
                    {bill.transaction.paymentStatus}
                  </Badge>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Load More Trigger for Progressive Loading */}
      <LoadMoreTrigger
        loadMoreRef={loadMoreRef}
        hasMore={hasMore}
        remainingCount={remainingCount}
        onLoadMore={loadMore}
        totalCount={totalCount}
      />

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex touch-none flex-col bg-black"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Header - minimal */}
          <div className="flex items-center justify-between bg-black/80 p-3">
            <span className="text-sm text-white/70">
              {currentIndex + 1} / {allBills.length}
            </span>
            {selectedSizeLabel && (
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-mono text-white/80">
                {selectedSizeLabel}
              </span>
            )}
            <button
              onClick={closeLightbox}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>

          {/* Image container */}
          <div
            ref={imageContainerRef}
            className="relative flex flex-1 items-center justify-center overflow-hidden"
          >
            <img
              src={selectedImage}
              alt="Bill"
              className="max-h-full max-w-full select-none object-contain"
              style={{
                transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
                transition: zoom === 1 ? "transform 0.2s" : "none",
              }}
              draggable={false}
            />

            {/* Carousel dots */}
            {zoom === 1 && allBills.length > 1 && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <div className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-2 backdrop-blur-sm">
                  {allBills.length <= 7 ? (
                    allBills.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          const bill = allBills[idx];
                          setSelectedImage(resolveImageUrl(bill.url));
                          setSelectedTransaction(bill.transaction);
                          setZoom(1);
                          setPosition({ x: 0, y: 0 });
                        }}
                        className="transition-all duration-200"
                        style={{
                          width: idx === currentIndex ? 20 : 8,
                          height: 8,
                          borderRadius: 999,
                          backgroundColor: idx === currentIndex
                            ? "white"
                            : "rgba(255,255,255,0.4)",
                        }}
                      />
                    ))
                  ) : (
                    <>
                      {(() => {
                        const maxDots = 7;
                        const start = Math.min(
                          Math.max(currentIndex - Math.floor(maxDots / 2), 0),
                          allBills.length - maxDots
                        );
                        return (
                          <>
                            {start > 0 && <span className="text-[10px] text-white/40">•••</span>}
                            {Array.from({ length: maxDots }, (_, i) => {
                              const idx = start + i;
                              const distance = Math.abs(idx - currentIndex);
                              return (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    const bill = allBills[idx];
                                    setSelectedImage(resolveImageUrl(bill.url));
                                    setSelectedTransaction(bill.transaction);
                                    setZoom(1);
                                    setPosition({ x: 0, y: 0 });
                                  }}
                                  className="transition-all duration-200"
                                  style={{
                                    width: idx === currentIndex ? 20 : distance <= 1 ? 8 : 6,
                                    height: idx === currentIndex ? 8 : distance <= 1 ? 8 : 6,
                                    borderRadius: 999,
                                    backgroundColor: idx === currentIndex
                                      ? "white"
                                      : `rgba(255,255,255,${distance <= 1 ? 0.5 : 0.25})`,
                                  }}
                                />
                              );
                            })}
                            {start + maxDots < allBills.length && <span className="text-[10px] text-white/40">•••</span>}
                          </>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Transaction details */}
          {selectedTransaction && (
            <div className="border-t border-white/10 bg-black/90 p-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-sm text-white/70">
                      <Calendar className="h-4 w-4" />
                      {new Date(selectedTransaction.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-white">
                      <IndianRupee className="h-4 w-4" />
                      {selectedTransaction.amount?.toLocaleString()}
                    </div>
                    <Badge
                      className={cn(
                        "text-xs",
                        paymentStatusColors[selectedTransaction.paymentStatus]
                      )}
                    >
                      {selectedTransaction.paymentStatus?.charAt(0).toUpperCase() +
                        selectedTransaction.paymentStatus?.slice(1)}
                    </Badge>
                  </div>
                </div>

                {/* Go to Supplier button - prominent at bottom */}
                <Link href={`/suppliers/${selectedTransaction.supplierId}`} className="w-full">
                  <Button className="w-full gap-2" size="lg">
                    <User className="h-5 w-5" />
                    Go to {getSupplierName(selectedTransaction.supplierId)}
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Thumbnail strip - Lazy loaded */}
          <div className="overflow-x-auto bg-black p-2">
            <div className="flex justify-start gap-2">
              {allBills.map((bill, idx) => (
                <LazyThumbnailButton
                  key={`thumb-${bill.transaction.id}-${bill.index}`}
                  bill={bill}
                  isSelected={resolveImageUrl(bill.url) === selectedImage}
                  onClick={() => {
                    setSelectedImage(resolveImageUrl(bill.url));
                    setSelectedTransaction(bill.transaction);
                    setZoom(1);
                    setPosition({ x: 0, y: 0 });
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Optimized thumbnail component with LQIP support
function OptimizedBillThumbnail({ url, alt, onError }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [sizeLabel, setSizeLabel] = useState("");
  // Resolve storage key to full URL first, then get optimized versions
  const resolvedUrl = resolveImageUrl(url);
  const urls = getOptimizedImageUrl(url);
  const isImageKit = resolvedUrl.includes("ik.imagekit.io");

  useEffect(() => {
    let isActive = true;
    setSizeLabel("");
    if (!resolvedUrl) return;

    getImageSizeBytes(resolvedUrl, { allowDownload: false }).then(bytes => {
      if (!isActive) return;
      const label = bytes ? formatBytes(bytes) : "";
      setSizeLabel(label);
    });

    return () => {
      isActive = false;
    };
  }, [resolvedUrl]);

  return (
    <>
      {/* LQIP blurred background */}
      {isImageKit && urls.lqip && (
        <img
          src={urls.lqip}
          alt=""
          aria-hidden="true"
          className={cn(
            "absolute inset-0 h-full w-full scale-110 object-cover transition-opacity duration-500",
            isLoaded ? "opacity-0" : "opacity-100 blur-xl"
          )}
        />
      )}
      {/* Thumbnail */}
      <img
        src={isImageKit ? urls.thumbnail : resolvedUrl}
        alt={alt}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-500",
          !isLoaded && isImageKit ? "opacity-0" : "opacity-100"
        )}
        onLoad={() => setIsLoaded(true)}
        onError={onError}
        loading="eager"
      />
      {sizeLabel && (
        <span className="absolute bottom-1 right-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-mono text-white">
          {sizeLabel}
        </span>
      )}
    </>
  );
}

// Lazy loading thumbnail button for the lightbox strip
function LazyThumbnailButton({ bill, isSelected, onClick }) {
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [sizeLabel, setSizeLabel] = useState("");
  const buttonRef = useRef(null);

  // Use IntersectionObserver for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px 0px", threshold: 0.01 }
    );

    if (buttonRef.current) {
      observer.observe(buttonRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Resolve storage key to full URL first, then get optimized versions
  const resolvedUrl = resolveImageUrl(bill.url);
  const urls = getOptimizedImageUrl(bill.url);
  const isImageKit = resolvedUrl.includes("ik.imagekit.io");

  useEffect(() => {
    let isActive = true;
    setSizeLabel("");
    if (!resolvedUrl) return;

    getImageSizeBytes(resolvedUrl, { allowDownload: false }).then(bytes => {
      if (!isActive) return;
      const label = bytes ? formatBytes(bytes) : "";
      setSizeLabel(label);
    });

    return () => {
      isActive = false;
    };
  }, [resolvedUrl]);

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      className={cn(
        "relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all",
        isSelected ? "border-primary ring-2 ring-primary/50" : "border-transparent opacity-60"
      )}
    >
      {isInView ? (
        <img
          src={isImageKit ? urls.thumbnail : resolvedUrl}
          alt=""
          className={cn(
            "h-full w-full object-cover transition-opacity duration-200",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setIsLoaded(true)}
          loading="eager"
        />
      ) : (
        <div className="h-full w-full animate-pulse bg-muted" />
      )}
      {sizeLabel && (
        <span className="absolute bottom-1 right-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[8px] font-mono text-white">
          {sizeLabel}
        </span>
      )}
    </button>
  );
}

export default BillGallery;
