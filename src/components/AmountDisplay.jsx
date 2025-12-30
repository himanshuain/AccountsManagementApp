"use client";

import { cn } from "@/lib/utils";

/**
 * Styled money display with proper typography
 * Uses monospace font for numbers and theme-aware colors
 */
export function AmountDisplay({
  amount,
  type = "neutral", // "positive" | "negative" | "pending" | "neutral"
  size = "md",
  showSign = false,
  showCurrency = true,
  className,
}) {
  const numAmount = Number(amount) || 0;
  
  // Determine display type based on amount if not specified
  const displayType = type === "neutral" && numAmount !== 0
    ? numAmount > 0 ? "positive" : "negative"
    : type;
  
  const sizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
  };
  
  const colorClasses = {
    positive: "amount-positive",
    negative: "amount-negative",
    pending: "amount-pending",
    neutral: "text-foreground",
  };
  
  const formattedAmount = Math.abs(numAmount).toLocaleString("en-IN");
  const sign = showSign && numAmount !== 0 
    ? (numAmount > 0 ? "+" : "-") 
    : (numAmount < 0 ? "-" : "");
  
  return (
    <span
      className={cn(
        "font-mono font-bold tabular-nums",
        sizeClasses[size],
        colorClasses[displayType],
        className
      )}
    >
      {sign}
      {showCurrency && "₹"}
      {formattedAmount}
    </span>
  );
}

/**
 * Compact amount badge for list items
 */
export function AmountBadge({
  amount,
  type = "neutral",
  className,
}) {
  const numAmount = Number(amount) || 0;
  
  const displayType = type === "neutral" && numAmount !== 0
    ? numAmount > 0 ? "positive" : "negative"
    : type;
  
  const bgClasses = {
    positive: "bg-emerald-500/20",
    negative: "bg-red-500/20",
    pending: "bg-amber-500/20",
    neutral: "bg-muted",
  };
  
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold font-mono",
        bgClasses[displayType],
        displayType === "positive" && "amount-positive",
        displayType === "negative" && "amount-negative",
        displayType === "pending" && "amount-pending",
        displayType === "neutral" && "text-foreground",
        className
      )}
    >
      ₹{Math.abs(numAmount).toLocaleString("en-IN")}
    </span>
  );
}

/**
 * Status indicator with amount
 */
export function PaymentStatus({
  total,
  paid,
  className,
}) {
  const pending = (Number(total) || 0) - (Number(paid) || 0);
  const progress = total > 0 ? (paid / total) * 100 : 0;
  const isPaid = pending <= 0;
  
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Total: <AmountDisplay amount={total} size="sm" />
        </span>
        <span className={isPaid ? "amount-positive" : "amount-pending"}>
          {isPaid ? "All Paid" : (
            <>Pending: <AmountDisplay amount={pending} size="sm" type="pending" /></>
          )}
        </span>
      </div>
      
      <div className="progress-hero">
        <div 
          className="progress-hero-fill"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default AmountDisplay;




