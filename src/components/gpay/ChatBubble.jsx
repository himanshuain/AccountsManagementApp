"use client";

import { useState } from "react";
import { ChevronRight, CheckCircle2, Clock, Image as ImageIcon, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/**
 * GPay-style chat bubble for transactions
 * Right-aligned: Bills/Udhar you gave (money flowing out)
 * Left-aligned: Payments received (money flowing in)
 */

export function ChatBubble({
  type = "bill", // "bill" | "payment"
  amount,
  description,
  date,
  time,
  status = "pending", // "pending" | "partial" | "paid"
  paidAmount,
  hasImages = false,
  imageCount = 0,
  notes,
  paymentMethod,
  onClick,
  className,
}) {
  const isPayment = type === "payment";
  const isPaid = status === "paid";
  const isPartial = status === "partial";
  const pendingAmount = amount - (paidAmount || 0);

  // Format time
  const formatTime = (dateStr, timeStr) => {
    if (timeStr) return timeStr;
    if (!dateStr) return "";

    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className={cn("mb-2 flex w-full", isPayment ? "justify-start" : "justify-end", className)}>
      <div
        onClick={onClick}
        className={cn(
          "relative max-w-[85%] cursor-pointer rounded-2xl p-3",
          "hw-accelerate transition-transform active:scale-[0.98]",
          // Bubble colors
          isPayment
            ? "rounded-tl-sm border border-border bg-card" // Left bubble (received)
            : "rounded-tr-sm bg-muted/80 dark:bg-zinc-800", // Right bubble (sent/gave)
          // Status-based border accent
          !isPayment && isPaid && "border-l-4 border-l-emerald-500",
          !isPayment && isPartial && "border-l-4 border-l-blue-500",
          !isPayment && !isPaid && !isPartial && "border-l-4 border-l-amber-500"
        )}
      >
        {/* Header - Type indicator */}
        <div className="mb-1 flex items-center gap-2">
          <span
            className={cn(
              "text-xs font-medium",
              isPayment ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
            )}
          >
            {isPayment ? "Payment received" : "Bill"}
          </span>
          {onClick && <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />}
        </div>

        {/* Amount */}
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-2xl font-bold tracking-tight",
              isPayment && "status-paid",
              !isPayment && isPaid && "status-paid",
              !isPayment && isPartial && "text-blue-600 dark:text-blue-400",
              !isPayment && !isPaid && !isPartial && "status-pending"
            )}
          >
            {isPayment && "+"} ₹{amount?.toLocaleString("en-IN")}
          </span>
        </div>

        {/* Status Badge */}
        <div className="mt-1.5 flex items-center gap-2">
          {isPaid ? (
            <Badge
              variant="secondary"
              className="badge-paid gap-1 border-0 px-1.5 py-0 text-[10px]"
            >
              <CheckCircle2 className="h-3 w-3" />
              Paid
            </Badge>
          ) : isPartial ? (
            <Badge
              variant="secondary"
              className="gap-1 border-0 bg-blue-500/20 px-1.5 py-0 text-[10px] text-blue-600 dark:text-blue-400"
            >
              <Clock className="h-3 w-3" />₹{pendingAmount?.toLocaleString("en-IN")} pending
            </Badge>
          ) : !isPayment ? (
            <Badge
              variant="secondary"
              className="badge-pending gap-1 border-0 px-1.5 py-0 text-[10px]"
            >
              <Clock className="h-3 w-3" />
              Pending
            </Badge>
          ) : null}

          {/* Description */}
          {description && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="max-w-[120px] truncate text-xs text-muted-foreground">
                {description}
              </span>
            </>
          )}
        </div>

        {/* Payment method for payments */}
        {isPayment && paymentMethod && (
          <p className="mt-1 text-xs text-muted-foreground">Via {paymentMethod}</p>
        )}

        {/* Notes */}
        {notes && (
          <p className="mt-2 line-clamp-2 text-xs italic text-muted-foreground">
            &quot;{notes}&quot;
          </p>
        )}

        {/* Footer - Time and attachments */}
        <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-1.5">
          <div className="flex items-center gap-2">
            {hasImages && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <ImageIcon className="h-3 w-3" />
                {imageCount > 1 ? imageCount : ""}
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">{formatTime(date, time)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact payment bubble for payment history timeline
 */
export function PaymentBubble({ amount, date, receiptUrl, notes, onReceiptClick, className }) {
  return (
    <div className={cn("flex items-start gap-2 py-2", className)}>
      {/* Timeline dot */}
      <div className="mt-1 flex flex-col items-center">
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
        <div className="min-h-[20px] w-0.5 flex-1 bg-emerald-500/30" />
      </div>

      {/* Payment info */}
      <div className="flex-1 pb-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            +₹{amount?.toLocaleString("en-IN")}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(date).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>

        {notes && (
          <p className="mt-0.5 text-xs italic text-muted-foreground">&quot;{notes}&quot;</p>
        )}

        {receiptUrl && (
          <button
            onClick={onReceiptClick}
            className="mt-1 flex items-center gap-1 text-xs text-primary"
          >
            <Receipt className="h-3 w-3" />
            View Receipt
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton loader for chat bubble
 */
export function ChatBubbleSkeleton({ align = "right" }) {
  return (
    <div className={cn("mb-2 flex w-full", align === "left" ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "w-[70%] rounded-2xl p-3",
          align === "left" ? "rounded-tl-sm" : "rounded-tr-sm",
          "bg-muted/50"
        )}
      >
        <div className="skeleton-shimmer mb-2 h-3 w-16 rounded" />
        <div className="skeleton-shimmer mb-2 h-7 w-24 rounded" />
        <div className="skeleton-shimmer mb-2 h-4 w-20 rounded" />
        <div className="mt-2 flex justify-between border-t border-border/30 pt-2">
          <div className="skeleton-shimmer h-3 w-8 rounded" />
          <div className="skeleton-shimmer h-3 w-12 rounded" />
        </div>
      </div>
    </div>
  );
}

export default ChatBubble;
