"use client";

import { cn } from "@/lib/utils";

/**
 * GPay-style date separator for chat view
 * Displays date with horizontal lines on both sides
 */

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateOnly.getTime() === today.getTime()) {
    return "Today";
  }
  
  if (dateOnly.getTime() === yesterday.getTime()) {
    return "Yesterday";
  }

  // Format with time if provided
  const dateOptions = {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  };

  return date.toLocaleDateString('en-IN', dateOptions);
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "";
  
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  let dateText = "";
  
  if (dateOnly.getTime() === today.getTime()) {
    dateText = "Today";
  } else if (dateOnly.getTime() === yesterday.getTime()) {
    dateText = "Yesterday";
  } else {
    dateText = date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  const timeText = date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return `${dateText}, ${timeText}`;
};

export function DateSeparator({ 
  date, 
  showTime = false,
  className 
}) {
  const displayText = showTime ? formatDateTime(date) : formatDate(date);

  return (
    <div className={cn(
      "flex items-center gap-3 py-4",
      className
    )}>
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground font-medium px-2">
        {displayText}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

/**
 * Month header for transaction grouping (like GPay history view)
 */
export function MonthHeader({
  month, // "2024-12" format or Date object
  year,
  totalAmount,
  isPositive = true,
  className
}) {
  const formatMonth = (monthStr) => {
    if (!monthStr) return "";
    
    let date;
    if (typeof monthStr === 'string') {
      // Handle "YYYY-MM" format
      const [y, m] = monthStr.split('-');
      date = new Date(parseInt(y), parseInt(m) - 1, 1);
    } else {
      date = monthStr;
    }
    
    return date.toLocaleDateString('en-IN', { month: 'long' });
  };

  const getYear = (monthStr) => {
    if (year) return year;
    if (!monthStr) return new Date().getFullYear();
    
    if (typeof monthStr === 'string') {
      return monthStr.split('-')[0];
    }
    return monthStr.getFullYear();
  };

  return (
    <div className={cn(
      "flex items-center justify-between py-3 px-1 sticky top-0 bg-background/95 backdrop-blur-sm z-10",
      className
    )}>
      <div>
        <span className="text-[10px] text-muted-foreground block">
          {getYear(month)}
        </span>
        <span className="text-lg font-bold">
          {formatMonth(month)}
        </span>
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
  );
}

/**
 * Simple divider line
 */
export function Divider({ className }) {
  return (
    <div className={cn("h-px bg-border my-2", className)} />
  );
}

export default DateSeparator;





