"use client";

import { Users, Plus, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeDate } from "@/lib/dateUtils";
import { haptics } from "@/hooks/useHaptics";

export function SupplierList({
  suppliers,
  transactions,
  loading,
  searchQuery,
  activeFilter,
  sortOrder,
  onSupplierClick,
  onAddClick,
  isOnline,
}) {
  if (loading) {
    return (
      <div className="space-y-3 py-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-5 w-24 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        {searchQuery ? (
          <>
            <p className="font-medium">No vyapari matches &quot;{searchQuery}&quot;</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different name or amount</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => onAddClick?.()}>
              Clear search
            </Button>
          </>
        ) : activeFilter !== "all" ? (
          <>
            <p className="font-medium">
              {activeFilter === "pending" && "No pending payments"}
              {activeFilter === "partial" && "No partially paid suppliers"}
              {activeFilter === "paid" && "No fully paid suppliers"}
              {activeFilter === "high" && "No high-value pending (₹10k+)"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeFilter === "paid" ? "Make payments to see them here" : "You're all caught up! 🎉"}
            </p>
          </>
        ) : (
          <>
            <p className="font-medium">No vyapari yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Add your first vyapari to start tracking</p>
            <Button size="sm" className="mt-3" onClick={onAddClick} disabled={!isOnline}>
              <Plus className="mr-1 h-4 w-4" />
              Add Vyapari
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 py-2">
      {suppliers.map(supplier => {
        // Get last transaction for this supplier
        const supplierTxns = transactions
          .filter(t => t.supplierId === supplier.id)
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        const lastTxn = supplierTxns[0];
        const lastTxnAmount = lastTxn ? (Number(lastTxn.amount) || 0) : 0;

        // Determine payment status
        const isPaid = supplier.pendingAmount === 0 && supplier.totalAmount > 0;
        const isPartial = supplier.pendingAmount > 0 && supplier.paidAmount > 0;
        const isPending = supplier.pendingAmount > 0 && supplier.paidAmount === 0;

        return (
          <Card
            key={supplier.id}
            className={cn(
              "cursor-pointer overflow-hidden transition-all hover:bg-muted/30 active:scale-[0.99] touch-manipulation",
              isPending
                ? "border-l-4 border-l-amber-500"
                : isPartial
                  ? "border-l-4 border-l-blue-500"
                  : isPaid
                    ? "border-l-4 border-l-green-500"
                    : "border-l-4 border-l-muted"
            )}
            onClick={() => {
              haptics.light();
              onSupplierClick(supplier);
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Avatar - smaller */}
                <div
                  className={cn(
                    "h-12 w-12 shrink-0 rounded-full p-0.5",
                    isPending
                      ? "bg-amber-500"
                      : isPartial
                        ? "bg-blue-500"
                        : isPaid
                          ? "bg-green-500"
                          : "bg-muted"
                  )}
                >
                  <div className="h-full w-full rounded-full bg-background">
                    {supplier.profilePicture ? (
                      <img
                        src={supplier.profilePicture}
                        alt={supplier.companyName}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                        {supplier.companyName?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Info - Hierarchy: Name → Pending → Status → Last Txn */}
                <div className="min-w-0 flex-1">
                  {/* Row 1: Name + Status Badge */}
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-base">{supplier.companyName}</p>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "shrink-0 text-[10px] px-1.5 py-0",
                        isPending && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                        isPartial && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                        isPaid && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      )}
                    >
                      {isPending ? "Total Pending" : isPartial ? "Partially Paid" : isPaid ? "Fully Paid" : "New"}
                    </Badge>
                  </div>

                  {/* Row 2: Pending Amount (HERO) */}
                  {supplier.pendingAmount > 0 && (
                    <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">
                      ₹{supplier.pendingAmount.toLocaleString()}
                    </p>
                  )}

                  {/* Row 3: Last transaction info */}
                  {lastTxn && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Latest Vypari bill of: ₹{lastTxnAmount.toLocaleString()} · {formatRelativeDate(lastTxn.date)}
                      {supplier.transactionCount > 1 && ` · ${supplier.transactionCount} txns`}
                    </p>
                  )}
                </div>

                {/* Chevron */}
                <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

