"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";

/**
 * Payment progress header - Fixed at top of chat view
 * Shows total amount, paid amount, and pending amount with visual progress bar
 */

export function PaymentProgress({
  totalAmount = 0,
  paidAmount = 0,
  label = "Payment Progress",
  showTrend = false,
  trend = 0, // Positive or negative percentage
  className
}) {
  const pendingAmount = Math.max(0, totalAmount - paidAmount);
  const progressPercent = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
  const isFullyPaid = pendingAmount === 0 && totalAmount > 0;

  return (
    <div className={cn(
      "bg-card/95 backdrop-blur-sm border-b border-border p-4",
      "sticky top-0 z-20",
      className
    )}>
      {/* Label */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        {showTrend && trend !== 0 && (
          <span className={cn(
            "flex items-center gap-1 text-xs font-medium",
            trend > 0 ? "text-emerald-500" : "text-red-500"
          )}>
            {trend > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(trend)}%
          </span>
        )}
      </div>

      {/* Total Amount */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl font-bold">
          ₹{totalAmount.toLocaleString('en-IN')}
        </span>
        {isFullyPaid && (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        )}
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            isFullyPaid 
              ? "bg-emerald-500" 
              : progressPercent > 50 
                ? "bg-blue-500" 
                : "bg-amber-500"
          )}
          style={{ width: `${Math.min(progressPercent, 100)}%` }}
        />
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">Paid:</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            ₹{paidAmount.toLocaleString('en-IN')}
          </span>
        </div>
        
        <div className="h-4 w-px bg-border" />
        
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">Pending:</span>
          <span className={cn(
            "font-semibold",
            pendingAmount > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
          )}>
            ₹{pendingAmount.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact progress bar for list items
 */
export function ProgressBar({
  total = 0,
  paid = 0,
  size = "sm",
  showLabels = false,
  className
}) {
  const percent = total > 0 ? (paid / total) * 100 : 0;
  const isComplete = paid >= total && total > 0;

  const sizeClasses = {
    xs: "h-1",
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  };

  return (
    <div className={cn("space-y-1", className)}>
      <div className={cn(
        "bg-muted rounded-full overflow-hidden",
        sizeClasses[size]
      )}>
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            isComplete ? "bg-emerald-500" : "bg-amber-500"
          )}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      
      {showLabels && (
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>₹{paid.toLocaleString('en-IN')} paid</span>
          <span>₹{Math.max(0, total - paid).toLocaleString('en-IN')} left</span>
        </div>
      )}
    </div>
  );
}

/**
 * Summary stats card for dashboard
 */
export function SummaryStats({
  totalAmount = 0,
  paidAmount = 0,
  youOwe = 0,
  owedToYou = 0,
  className
}) {
  return (
    <div className={cn(
      "bg-gradient-to-br from-muted/50 to-muted/30 rounded-2xl p-4",
      className
    )}>
      {/* Main Pending Amount */}
      <div className="text-center mb-4">
        <span className="text-xs text-muted-foreground block mb-1">
          Total Pending
        </span>
        <span className="text-3xl font-bold text-amber-500">
          ₹{Math.max(0, totalAmount - paidAmount).toLocaleString('en-IN')}
        </span>
      </div>

      {/* Breakdown */}
      <div className="flex items-center justify-around pt-3 border-t border-border">
        <div className="text-center">
          <span className="text-[10px] text-muted-foreground block">You Owe</span>
          <span className="text-sm font-semibold text-red-500">
            ₹{youOwe.toLocaleString('en-IN')}
          </span>
        </div>
        
        <div className="h-8 w-px bg-border" />
        
        <div className="text-center">
          <span className="text-[10px] text-muted-foreground block">Owed to You</span>
          <span className="text-sm font-semibold text-emerald-500">
            ₹{owedToYou.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
}

export default PaymentProgress;





