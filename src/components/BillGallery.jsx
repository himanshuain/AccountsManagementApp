"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { X, User, Calendar, IndianRupee, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function BillGallery({ transactions, suppliers }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [allBills, setAllBills] = useState([]);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [imageErrors, setImageErrors] = useState({});

  // Touch handling refs
  const touchStartRef = useRef({ x: 0, y: 0, distance: 0 });
  const imageContainerRef = useRef(null);
  const lastTapRef = useRef(0);

  // Flatten all bills from all transactions
  useEffect(() => {
    const bills = [];
    transactions.forEach((transaction) => {
      if (transaction.billImages && transaction.billImages.length > 0) {
        transaction.billImages.forEach((imageUrl, index) => {
          if (imageUrl) {
            bills.push({
              url: imageUrl,
              transaction: transaction,
              supplier: suppliers.find((s) => s.id === transaction.supplierId),
              index: index,
            });
          }
        });
      }
    });
    setAllBills(bills);
  }, [transactions, suppliers]);

  const currentIndex = allBills.findIndex((b) => b.url === selectedImage);

  const openLightbox = (bill) => {
    setSelectedImage(bill.url);
    setSelectedTransaction(bill.transaction);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const closeLightbox = () => {
    setSelectedImage(null);
    setSelectedTransaction(null);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prevBill = allBills[currentIndex - 1];
      setSelectedImage(prevBill.url);
      setSelectedTransaction(prevBill.transaction);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [currentIndex, allBills]);

  const goToNext = useCallback(() => {
    if (currentIndex < allBills.length - 1) {
      const nextBill = allBills[currentIndex + 1];
      setSelectedImage(nextBill.url);
      setSelectedTransaction(nextBill.transaction);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [currentIndex, allBills]);

  // Touch handlers for swipe and pinch zoom
  const handleTouchStart = (e) => {
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

  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const scale = distance / touchStartRef.current.distance;

      setZoom((prev) => {
        const newZoom = prev * scale;
        return Math.min(Math.max(newZoom, 0.5), 4);
      });
      touchStartRef.current.distance = distance;
    }
  };

  const handleTouchEnd = (e) => {
    if (e.changedTouches.length === 1 && zoom === 1) {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = endX - touchStartRef.current.x;
      const diffY = endY - touchStartRef.current.y;

      // Check for double tap to zoom
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        setZoom((prev) => (prev === 1 ? 2 : 1));
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
    const handleKeyDown = (e) => {
      if (!selectedImage) return;

      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") goToPrevious();
      if (e.key === "ArrowRight") goToNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImage, goToPrevious, goToNext]);

  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    return supplier?.companyName || supplier?.name || "Unknown";
  };

  const paymentStatusColors = {
    paid: "bg-green-500/20 text-green-400",
    pending: "bg-amber-500/20 text-amber-400",
    partial: "bg-blue-500/20 text-blue-400",
  };

  const handleImageError = (billId) => {
    setImageErrors((prev) => ({ ...prev, [billId]: true }));
  };

  if (allBills.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No bill images uploaded yet</p>
        <p className="text-sm mt-1">Upload bills when adding transactions</p>
      </div>
    );
  }

  return (
    <>
      {/* Gallery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {allBills.map((bill) => {
          const billId = `${bill.transaction.id}-${bill.index}`;
          const hasError = imageErrors[billId];

          return (
            <Card
              key={billId}
              className="cursor-pointer overflow-hidden hover:ring-2 hover:ring-primary transition-all"
              onClick={() => !hasError && openLightbox(bill)}
            >
              <div className="aspect-[4/3] relative bg-muted">
                {hasError ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                ) : (
                  <img
                    src={bill.url}
                    alt={`Bill from ${getSupplierName(bill.transaction.supplierId)}`}
                    className="w-full h-full object-cover"
                    onError={() => handleImageError(billId)}
                    loading="lazy"
                  />
                )}
              </div>
              {/* Info always visible */}
              <div className="p-2 bg-card border-t">
                <p className="text-xs font-medium truncate">
                  {getSupplierName(bill.transaction.supplierId)}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">
                    ₹{bill.transaction.amount?.toLocaleString()}
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] px-1.5 py-0",
                      bill.transaction.paymentStatus === "paid"
                        ? "text-green-600"
                        : "text-amber-600",
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

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Header - minimal */}
          <div className="flex items-center justify-between p-3 bg-black/80">
            <span className="text-white/70 text-sm">
              {currentIndex + 1} / {allBills.length}
            </span>
            <button
              onClick={closeLightbox}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>

          {/* Image container */}
          <div
            ref={imageContainerRef}
            className="flex-1 relative overflow-hidden flex items-center justify-center"
          >
            <img
              src={selectedImage}
              alt="Bill"
              className="max-h-full max-w-full object-contain select-none"
              style={{
                transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
                transition: zoom === 1 ? "transform 0.2s" : "none",
              }}
              draggable={false}
            />

            {/* Swipe hint for mobile */}
            {zoom === 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs flex items-center gap-2">
                <span>← Swipe to navigate →</span>
              </div>
            )}
          </div>

          {/* Transaction details */}
          {selectedTransaction && (
            <div className="p-4 bg-black/90 border-t border-white/10">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-white/70 text-sm">
                      <Calendar className="h-4 w-4" />
                      {new Date(selectedTransaction.date).toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-white font-semibold">
                      <IndianRupee className="h-4 w-4" />
                      {selectedTransaction.amount?.toLocaleString()}
                    </div>
                    <Badge
                      className={cn(
                        "text-xs",
                        paymentStatusColors[selectedTransaction.paymentStatus],
                      )}
                    >
                      {selectedTransaction.paymentStatus
                        ?.charAt(0)
                        .toUpperCase() +
                        selectedTransaction.paymentStatus?.slice(1)}
                    </Badge>
                  </div>
                </div>

                {/* Go to Supplier button - prominent at bottom */}
                <Link
                  href={`/suppliers/${selectedTransaction.supplierId}`}
                  className="w-full"
                >
                  <Button className="w-full gap-2" size="lg">
                    <User className="h-5 w-5" />
                    Go to {getSupplierName(selectedTransaction.supplierId)}
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Thumbnail strip */}
          <div className="p-2 bg-black overflow-x-auto">
            <div className="flex gap-2 justify-start">
              {allBills.map((bill) => (
                <button
                  key={`thumb-${bill.transaction.id}-${bill.index}`}
                  onClick={() => {
                    setSelectedImage(bill.url);
                    setSelectedTransaction(bill.transaction);
                    setZoom(1);
                    setPosition({ x: 0, y: 0 });
                  }}
                  className={cn(
                    "h-14 w-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0",
                    bill.url === selectedImage
                      ? "border-primary ring-2 ring-primary/50"
                      : "border-transparent opacity-60",
                  )}
                >
                  <img
                    src={bill.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BillGallery;
