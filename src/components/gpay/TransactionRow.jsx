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
  className,
}) {
  const isIncome = type === "income" || type === "payment";
  const isFailed = status === "failed";
  const isPending = status === "pending";

  // Format date
  const formatDate = dateStr => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
    });
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "-mx-3 flex items-center gap-3 p-3",
        "cursor-pointer transition-colors active:bg-muted/50",
        "border-b border-border/50 last:border-b-0",
        className
      )}
    >
      {/* Avatar */}
      <PersonAvatar name={name} image={image} size="md" />

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(date)}
          {description && ` • ${description}`}
        </p>
      </div>

      {/* Amount and Status */}
      <div className="flex-shrink-0 text-right">
        <p
          className={cn(
            "font-semibold",
            isFailed && "text-muted-foreground line-through",
            !isFailed && isIncome && "text-emerald-500",
            !isFailed && !isIncome && isPending && "text-amber-500"
          )}
        >
          {isIncome && !isFailed && "+"} ₹{amount?.toLocaleString("en-IN")}
        </p>

        {/* Status indicator */}
        {isFailed && (
          <span className="mt-0.5 flex items-center justify-end gap-1 text-xs text-red-500">
            <XCircle className="h-3 w-3" />
            Failed
          </span>
        )}
        {isPending && !isFailed && (
          <span className="mt-0.5 flex items-center justify-end gap-1 text-xs text-amber-500">
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
    <div className="-mx-3 flex items-center gap-3 border-b border-border/50 p-3">
      <div className="skeleton-shimmer h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="skeleton-shimmer h-4 w-32 rounded" />
        <div className="skeleton-shimmer h-3 w-24 rounded" />
      </div>
      <div className="space-y-2 text-right">
        <div className="skeleton-shimmer ml-auto h-4 w-16 rounded" />
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
  className,
}) {
  return (
    <div className={cn("mb-4", className)}>
      {/* Month Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-background/95 py-3 backdrop-blur-sm">
        <div>
          <span className="block text-[10px] text-muted-foreground">{year}</span>
          <span className="text-lg font-bold">{month}</span>
        </div>
        {totalAmount !== undefined && (
          <span
            className={cn(
              "text-base font-semibold",
              isPositive ? "text-emerald-500" : "text-foreground"
            )}
          >
            {isPositive && "+"} ₹{Math.abs(totalAmount).toLocaleString("en-IN")}
          </span>
        )}
      </div>

      {/* Transactions */}
      <div className="overflow-hidden rounded-xl border bg-card">
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
