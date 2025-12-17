"use client";

import { Clock, CheckCircle, TrendingUp, TrendingDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { haptics } from "@/hooks/useHaptics";

export function FilterChips({
  activeFilter,
  sortOrder,
  onFilterChange,
  onSortChange,
  summaryStats,
  totalCount,
}) {
  const handleFilterClick = (filter) => {
    haptics.light();
    onFilterChange(filter);
  };

  const handleSortClick = (order) => {
    haptics.light();
    onSortChange(order);
  };

  return (
    <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <Button
          variant={activeFilter === "all" ? "default" : "outline"}
          size="sm"
          className="h-9 shrink-0 rounded-full px-4 text-xs min-w-[60px]"
          onClick={() => handleFilterClick("all")}
        >
          All ({totalCount})
        </Button>
        
        {/* Sorting Chips - After All */}
        <div className="mx-1 h-9 w-px shrink-0 bg-border" />
        <Button
          variant={sortOrder === "newest" ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-9 shrink-0 rounded-full px-4 text-xs min-w-[80px]",
            sortOrder !== "newest" && "border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950"
          )}
          onClick={() => handleSortClick("newest")}
        >
          <ArrowDown className="mr-1 h-3 w-3" />
          Newest
        </Button>
        <Button
          variant={sortOrder === "oldest" ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-9 shrink-0 rounded-full px-4 text-xs min-w-[80px]",
            sortOrder !== "oldest" && "border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950"
          )}
          onClick={() => handleSortClick("oldest")}
        >
          <ArrowUp className="mr-1 h-3 w-3" />
          Oldest
        </Button>
        <Button
          variant={sortOrder === "highest" ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-9 shrink-0 rounded-full px-4 text-xs min-w-[80px]",
            sortOrder !== "highest" && "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
          )}
          onClick={() => handleSortClick("highest")}
        >
          <TrendingUp className="mr-1 h-3 w-3" />
          Max ₹
        </Button>
        <Button
          variant={sortOrder === "lowest" ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-9 shrink-0 rounded-full px-4 text-xs min-w-[80px]",
            sortOrder !== "lowest" && "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
          )}
          onClick={() => handleSortClick("lowest")}
        >
          <TrendingDown className="mr-1 h-3 w-3" />
          Min ₹
        </Button>
        <div className="mx-1 h-9 w-px shrink-0 bg-border" />

        <Button
          variant={activeFilter === "pending" ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-9 shrink-0 rounded-full px-4 text-xs min-w-[100px]",
            activeFilter !== "pending" && "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950"
          )}
          onClick={() => handleFilterClick("pending")}
        >
          <Clock className="mr-1 h-3 w-3" />
          Pending ({summaryStats.pendingCount})
        </Button>
        <Button
          variant={activeFilter === "partial" ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-9 shrink-0 rounded-full px-4 text-xs min-w-[100px]",
            activeFilter !== "partial" && "border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950"
          )}
          onClick={() => handleFilterClick("partial")}
        >
          Partial ({summaryStats.partialCount})
        </Button>
        <Button
          variant={activeFilter === "paid" ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-9 shrink-0 rounded-full px-4 text-xs min-w-[120px]",
            activeFilter !== "paid" && "border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
          )}
          onClick={() => handleFilterClick("paid")}
        >
          <CheckCircle className="mr-1 h-3 w-3" />
          All Paid Up ({summaryStats.paidCount})
        </Button>
        {summaryStats.highAmountCount > 0 && (
          <Button
            variant={activeFilter === "high" ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-9 shrink-0 rounded-full px-4 text-xs min-w-[100px]",
              activeFilter !== "high" && "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
            )}
            onClick={() => handleFilterClick("high")}
          >
            High ₹10k+ ({summaryStats.highAmountCount})
          </Button>
        )}
      </div>
    </div>
  );
}

