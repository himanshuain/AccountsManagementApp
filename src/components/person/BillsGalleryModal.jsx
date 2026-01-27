"use client";

import { useMemo } from "react";
import { X, Images } from "lucide-react";
import { format, parseISO } from "date-fns";
import { resolveImageUrl } from "@/lib/image-url";

/**
 * Bills Gallery Modal - Shows all bills & receipts for transactions
 */
export function BillsGalleryModal({ transactions, onClose, onViewImages }) {
  const allBills = useMemo(() => {
    const bills = [];
    transactions.forEach(txn => {
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 pb-14 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="animate-slide-up flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl bg-card sm:max-w-2xl sm:rounded-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center py-3 sm:hidden">
          <div className="sheet-handle" />
        </div>

        <div className="border-b border-border px-4 pb-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg tracking-wide">All Bills & Receipts</h3>
            <button onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {allBills.length} image{allBills.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="pb-safe flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {allBills.length === 0 ? (
            <div className="py-12 text-center">
              <Images className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No bills attached yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {allBills.map((bill, idx) => (
                <div
                  key={`${bill.txnId}-${bill.index}`}
                  onClick={() => {
                    const txn = transactions.find(t => t.id === bill.txnId);
                    const images = txn?.billImages || txn?.khataPhotos;
                    if (images?.length > 0) {
                      onViewImages(images, bill.index);
                    }
                  }}
                  className="relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-muted transition-transform active:scale-95"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveImageUrl(bill.url)}
                    alt={`Bill ${idx + 1}`}
                    className="h-full w-full object-cover"
                    loading="eager"
                    onError={e => {
                      e.target.style.opacity = "0";
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-green-700 px-2 pb-2 pt-4">
                    <p className="font-mono text-sm font-semibold text-white">
                      ₹{Number(bill.txnAmount).toLocaleString("en-IN")}
                    </p>
                    <p className="text-[11px] text-white/80">
                      {format(parseISO(bill.txnDate), "dd MMM yyyy")}
                    </p>
                    {bill.txnDescription && (
                      <p className="mt-0.5 truncate text-[10px] text-white/60">
                        {bill.txnDescription}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BillsGalleryModal;
