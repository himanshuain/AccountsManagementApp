"use client";

import { useState } from "react";
import { 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  Image as ImageIcon,
  Receipt
} from "lucide-react";
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
  className
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
    return d.toLocaleTimeString('en-IN', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div
      className={cn(
        "flex w-full mb-2",
        isPayment ? "justify-start" : "justify-end",
        className
      )}
    >
      <div
        onClick={onClick}
        className={cn(
          "relative max-w-[85%] rounded-2xl p-3 cursor-pointer",
          "active:scale-[0.98] transition-transform hw-accelerate",
          // Bubble colors
          isPayment 
            ? "bg-card border border-border rounded-tl-sm" // Left bubble (received)
            : "bg-muted/80 dark:bg-zinc-800 rounded-tr-sm", // Right bubble (sent/gave)
          // Status-based border accent
          !isPayment && isPaid && "border-l-4 border-l-emerald-500",
          !isPayment && isPartial && "border-l-4 border-l-blue-500",
          !isPayment && !isPaid && !isPartial && "border-l-4 border-l-amber-500"
        )}
      >
        {/* Header - Type indicator */}
        <div className="flex items-center gap-2 mb-1">
          <span className={cn(
            "text-xs font-medium",
            isPayment ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
          )}>
            {isPayment ? "Payment received" : "Bill"}
          </span>
          {onClick && (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
          )}
        </div>

        {/* Amount */}
        <div className="flex items-baseline gap-2">
          <span className={cn(
            "text-2xl font-bold tracking-tight",
            isPayment && "status-paid",
            !isPayment && isPaid && "status-paid",
            !isPayment && isPartial && "text-blue-600 dark:text-blue-400",
            !isPayment && !isPaid && !isPartial && "status-pending"
          )}>
            {isPayment && "+"} ₹{amount?.toLocaleString('en-IN')}
          </span>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 mt-1.5">
          {isPaid ? (
            <Badge 
              variant="secondary" 
              className="gap-1 badge-paid border-0 text-[10px] px-1.5 py-0"
            >
              <CheckCircle2 className="h-3 w-3" />
              Paid
            </Badge>
          ) : isPartial ? (
            <Badge 
              variant="secondary" 
              className="gap-1 bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0 text-[10px] px-1.5 py-0"
            >
              <Clock className="h-3 w-3" />
              ₹{pendingAmount?.toLocaleString('en-IN')} pending
            </Badge>
          ) : !isPayment ? (
            <Badge 
              variant="secondary" 
              className="gap-1 badge-pending border-0 text-[10px] px-1.5 py-0"
            >
              <Clock className="h-3 w-3" />
              Pending
            </Badge>
          ) : null}

          {/* Description */}
          {description && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                {description}
              </span>
            </>
          )}
        </div>

        {/* Payment method for payments */}
        {isPayment && paymentMethod && (
          <p className="text-xs text-muted-foreground mt-1">
            Via {paymentMethod}
          </p>
        )}

        {/* Notes */}
        {notes && (
          <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2">
            &quot;{notes}&quot;
          </p>
        )}

        {/* Footer - Time and attachments */}
        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/50">
          <div className="flex items-center gap-2">
            {hasImages && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <ImageIcon className="h-3 w-3" />
                {imageCount > 1 ? imageCount : ""}
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {formatTime(date, time)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact payment bubble for payment history timeline
 */
export function PaymentBubble({
  amount,
  date,
  receiptUrl,
  notes,
  onReceiptClick,
  className
}) {
  return (
    <div className={cn(
      "flex items-start gap-2 py-2",
      className
    )}>
      {/* Timeline dot */}
      <div className="flex flex-col items-center mt-1">
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
        <div className="w-0.5 flex-1 bg-emerald-500/30 min-h-[20px]" />
      </div>

      {/* Payment info */}
      <div className="flex-1 pb-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            +₹{amount?.toLocaleString('en-IN')}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short'
            })}
          </span>
        </div>
        
        {notes && (
          <p className="text-xs text-muted-foreground mt-0.5 italic">
            &quot;{notes}&quot;
          </p>
        )}

        {receiptUrl && (
          <button
            onClick={onReceiptClick}
            className="flex items-center gap-1 mt-1 text-xs text-primary"
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
    <div className={cn(
      "flex w-full mb-2",
      align === "left" ? "justify-start" : "justify-end"
    )}>
      <div className={cn(
        "w-[70%] rounded-2xl p-3",
        align === "left" ? "rounded-tl-sm" : "rounded-tr-sm",
        "bg-muted/50"
      )}>
        <div className="h-3 w-16 skeleton-shimmer rounded mb-2" />
        <div className="h-7 w-24 skeleton-shimmer rounded mb-2" />
        <div className="h-4 w-20 skeleton-shimmer rounded mb-2" />
        <div className="flex justify-between mt-2 pt-2 border-t border-border/30">
          <div className="h-3 w-8 skeleton-shimmer rounded" />
          <div className="h-3 w-12 skeleton-shimmer rounded" />
        </div>
      </div>
    </div>
  );
}

export default ChatBubble;

