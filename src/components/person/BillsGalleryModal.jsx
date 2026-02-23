"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Images, ExternalLink, Receipt } from "lucide-react";
import { format, parseISO } from "date-fns";
import { resolveImageUrl } from "@/lib/image-url";
import { SwipeCarousel } from "@/components/ui/swipe-carousel";
import { DragCloseDrawer, DrawerHeader, DrawerTitle } from "@/components/ui/drag-close-drawer";
import { cn } from "@/lib/utils";

function BillStripItem({ bill, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-shrink-0 flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-all",
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted/60 text-muted-foreground hover:bg-muted"
      )}
    >
      <span className={cn("font-mono text-xs font-bold", isActive && "text-primary-foreground")}>
        ₹{Number(bill.txnAmount).toLocaleString("en-IN")}
      </span>
      <span className={cn("text-[10px]", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>
        {format(parseISO(bill.txnDate), "dd MMM")}
      </span>
    </button>
  );
}

/**
 * Bills Gallery Drawer - Shows all bills & receipts in a DragCloseDrawer
 * with a SwipeCarousel and a quick-jump strip by date/amount.
 */
export function BillsGalleryModal({
  open,
  onOpenChange,
  transactions,
  onClose,
  onViewImages,
  onGoToBill,
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [jumpIdx, setJumpIdx] = useState(undefined);
  const stripRef = useRef(null);
  const itemRefs = useRef({});

  const handleClose = useCallback(
    (val) => {
      if (onOpenChange) onOpenChange(val);
      else if (!val && onClose) onClose();
    },
    [onOpenChange, onClose]
  );

  const isOpen = open !== undefined ? open : true;

  const allBills = useMemo(() => {
    const bills = [];
    (transactions || []).forEach((txn) => {
      const images = txn.billImages || txn.khataPhotos;
      if (images?.length > 0) {
        images.forEach((img, idx) => {
          bills.push({
            url: img,
            txnId: txn.id,
            txnAmount: txn.amount,
            txnDate: txn.date,
            txnDescription: txn.description || txn.itemName,
            index: idx,
          });
        });
      }
    });
    return bills;
  }, [transactions]);

  const current = allBills[currentIdx] || allBills[0];

  const handleImageClick = useCallback(
    (img, idx) => {
      const bill = allBills[idx];
      if (bill) {
        const txn = (transactions || []).find((t) => t.id === bill.txnId);
        const images = txn?.billImages || txn?.khataPhotos;
        if (images?.length > 0) {
          onViewImages?.(images, bill.index);
        }
      }
    },
    [allBills, transactions, onViewImages]
  );

  const handleStripTap = useCallback((idx) => {
    setJumpIdx(idx);
    setCurrentIdx(idx);
  }, []);

  useEffect(() => {
    const el = itemRefs.current[currentIdx];
    if (el && stripRef.current) {
      el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [currentIdx]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentIdx(0);
      setJumpIdx(undefined);
    }
  }, [isOpen]);

  return (
    <DragCloseDrawer open={isOpen} onOpenChange={handleClose} height="h-[90vh]">
      <DrawerHeader className="border-b px-4 pb-3">
        <div>
          <DrawerTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            All Bills & Receipts
          </DrawerTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {allBills.length} image{allBills.length !== 1 ? "s" : ""}
          </p>
        </div>
      </DrawerHeader>

      {allBills.length === 0 ? (
        <div className="py-16 text-center">
          <Images className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No bills attached yet</p>
        </div>
      ) : (
        <div className="space-y-3 pb-8">
          {/* Carousel */}
          <SwipeCarousel
            images={allBills.map((b) => ({
              src: resolveImageUrl(b.url),
              alt: `Bill - ₹${Number(b.txnAmount).toLocaleString("en-IN")}`,
            }))}
            autoPlay={false}
            aspectRatio="aspect-[4/3]"
            showDots={false}
            showGradientEdges={allBills.length > 1}
            onSlideChange={setCurrentIdx}
            onImageClick={handleImageClick}
            activeIndex={jumpIdx}
          />

          {/* Quick-jump strip */}
          {allBills.length > 1 && (
            <div
              ref={stripRef}
              className="flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none"
            >
              {allBills.map((bill, idx) => (
                <div key={`${bill.txnId}-${bill.index}`} ref={(el) => (itemRefs.current[idx] = el)}>
                  <BillStripItem
                    bill={bill}
                    isActive={idx === currentIdx}
                    onClick={() => handleStripTap(idx)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Current bill info */}
          {current && (
            <div className="mx-4 flex items-center justify-between rounded-xl bg-muted/30 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm font-semibold">
                  ₹{Number(current.txnAmount).toLocaleString("en-IN")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {format(parseISO(current.txnDate), "dd MMM yyyy")}
                </p>
                {current.txnDescription && (
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {current.txnDescription}
                  </p>
                )}
              </div>
              {onGoToBill && (
                <button
                  onClick={() => {
                    handleClose(false);
                    onGoToBill(current.txnId);
                  }}
                  className="ml-3 flex flex-shrink-0 items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent active:scale-95"
                >
                  <ExternalLink className="h-3 w-3" />
                  Go to Bill
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </DragCloseDrawer>
  );
}

export default BillsGalleryModal;
