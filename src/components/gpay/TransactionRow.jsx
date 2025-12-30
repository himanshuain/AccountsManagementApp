"use client";

import { cn } from "@/lib/utils";
import { PersonAvatar } from "./PersonAvatar";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

/**
 * GPay-style transaction row for history list view
 * Shows avatar, name, date, amount, and status
 */

export function TransactionRow({
  name,
  image,
  date,
  amount,
  type = "expense", // "expense" | "income" | "payment"
  status = "success", // "success" | "pending" | "failed"
  description,
  onClick,
  className
}) {
  const isIncome = type === "income" || type === "payment";
  const isFailed = status === "failed";
  const isPending = status === "pending";

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long'
    });
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 -mx-3",
        "active:bg-muted/50 transition-colors cursor-pointer",
        "border-b border-border/50 last:border-b-0",
        className
      )}
    >
      {/* Avatar */}
      <PersonAvatar name={name} image={image} size="md" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{name}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(date)}
          {description && ` • ${description}`}
        </p>
      </div>

      {/* Amount and Status */}
      <div className="text-right flex-shrink-0">
        <p className={cn(
          "font-semibold",
          isFailed && "text-muted-foreground line-through",
          !isFailed && isIncome && "text-emerald-500",
          !isFailed && !isIncome && isPending && "text-amber-500"
        )}>
          {isIncome && !isFailed && "+"} ₹{amount?.toLocaleString('en-IN')}
        </p>
        
        {/* Status indicator */}
        {isFailed && (
          <span className="flex items-center justify-end gap-1 text-xs text-red-500 mt-0.5">
            <XCircle className="h-3 w-3" />
            Failed
          </span>
        )}
        {isPending && !isFailed && (
          <span className="flex items-center justify-end gap-1 text-xs text-amber-500 mt-0.5">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton loader for transaction row
 */
export function TransactionRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 -mx-3 border-b border-border/50">
      <div className="h-12 w-12 rounded-full skeleton-shimmer" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 skeleton-shimmer rounded" />
        <div className="h-3 w-24 skeleton-shimmer rounded" />
      </div>
      <div className="text-right space-y-2">
        <div className="h-4 w-16 skeleton-shimmer rounded ml-auto" />
      </div>
    </div>
  );
}

/**
 * Grouped transactions by month (for history view)
 */
export function TransactionGroup({
  month,
  year,
  totalAmount,
  isPositive = true,
  transactions = [],
  onTransactionClick,
  className
}) {
  return (
    <div className={cn("mb-4", className)}>
      {/* Month Header */}
      <div className="flex items-center justify-between py-3 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <div>
          <span className="text-[10px] text-muted-foreground block">{year}</span>
          <span className="text-lg font-bold">{month}</span>
        </div>
        {totalAmount !== undefined && (
          <span className={cn(
            "text-base font-semibold",
            isPositive ? "text-emerald-500" : "text-foreground"
          )}>
            {isPositive && "+"} ₹{Math.abs(totalAmount).toLocaleString('en-IN')}
          </span>
        )}
      </div>

      {/* Transactions */}
      <div className="bg-card rounded-xl border overflow-hidden">
        {transactions.map((txn, index) => (
          <TransactionRow
            key={txn.id || index}
            name={txn.name}
            image={txn.image}
            date={txn.date}
            amount={txn.amount}
            type={txn.type}
            status={txn.status}
            description={txn.description}
            onClick={() => onTransactionClick?.(txn)}
          />
        ))}
      </div>
    </div>
  );
}

export default TransactionRow;




