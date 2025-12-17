"use client";

import { useState, useMemo } from "react";
import { Receipt, Clock, CheckCircle, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Autocomplete } from "@/components/ui/autocomplete";
import { cn } from "@/lib/utils";
import { TransactionTable } from "@/components/TransactionTable";
import { BillGallery } from "@/components/BillGallery";
import { haptics } from "@/hooks/useHaptics";

export function TransactionsSection({
  transactions,
  suppliers,
  isExpanded,
  onExpandedChange,
  onEditTransaction,
  onDeleteTransaction,
  isOnline,
}) {
  const [allTxnSubTab, setAllTxnSubTab] = useState("list");
  const [allTxnStatusFilter, setAllTxnStatusFilter] = useState("all");
  const [allTxnSupplierFilter, setAllTxnSupplierFilter] = useState("all");
  const [allTxnAmountSort, setAllTxnAmountSort] = useState("newest");

  // All filtered transactions for the transactions section
  const allFilteredTransactions = useMemo(() => {
    let filtered = [...transactions];
    if (allTxnStatusFilter !== "all") {
      filtered = filtered.filter(t => t.paymentStatus === allTxnStatusFilter);
    }
    if (allTxnSupplierFilter !== "all") {
      filtered = filtered.filter(t => t.supplierId === allTxnSupplierFilter);
    }

    // Sort based on selected option
    if (allTxnAmountSort === "highest") {
      return filtered.sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
    } else if (allTxnAmountSort === "lowest") {
      return filtered.sort((a, b) => (Number(a.amount) || 0) - (Number(b.amount) || 0));
    } else if (allTxnAmountSort === "oldest") {
      return [...filtered].sort((a, b) => {
        // Use createdAt (full timestamp) as primary, date as fallback
        const dateA = new Date(a.createdAt || a.date || 0);
        const dateB = new Date(b.createdAt || b.date || 0);
        return dateA.getTime() - dateB.getTime();
      });
    }

    // Default: newest first
    return [...filtered].sort((a, b) => {
      // Use createdAt (full timestamp) as primary, date as fallback
      const dateA = new Date(a.createdAt || a.date || 0);
      const dateB = new Date(b.createdAt || b.date || 0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [transactions, allTxnStatusFilter, allTxnSupplierFilter, allTxnAmountSort]);

  const totalBillsCount = useMemo(() => {
    return allFilteredTransactions.reduce((count, t) => count + (t.billImages?.length || 0), 0);
  }, [allFilteredTransactions]);

  return (
    <Collapsible open={isExpanded} onOpenChange={onExpandedChange}>
      <CollapsibleTrigger asChild>
        <button className="sticky top-[57px] z-20 -mx-4 flex w-[calc(100%+2rem)] items-center justify-between rounded-lg border border-purple-200 bg-background/95 px-5 py-3 backdrop-blur transition-colors hover:bg-muted/50 supports-[backdrop-filter]:bg-background/80 lg:top-[105px] touch-manipulation">
          <div className="flex items-center gap-3">
            <Receipt className="h-5 w-5 text-purple-500" />
            <span className="font-semibold">All Transactions</span>
            <Badge variant="secondary" className="text-xs">
              {transactions.length}
            </Badge>
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 text-muted-foreground transition-transform",
              isExpanded && "rotate-180"
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-4 py-3">
          {/* Filter Chips - One-tap toggles - Sticky when expanded */}
          <div className="sticky top-[102px] z-10 -mx-4 flex gap-2 overflow-x-auto border-b bg-background/95 px-5 pb-2 pt-4 backdrop-blur scrollbar-none supports-[backdrop-filter]:bg-background/80 lg:top-[153px]">
            <Button
              variant={allTxnStatusFilter === "all" ? "default" : "outline"}
              size="sm"
              className="h-9 shrink-0 rounded-full px-4 text-xs min-w-[60px] touch-manipulation"
              onClick={() => {
                haptics.light();
                setAllTxnStatusFilter("all");
                setAllTxnAmountSort("newest");
              }}
            >
              All ({transactions.length})
            </Button>
            
            {/* Sorting Chips */}
            <div className="mx-1 h-9 w-px shrink-0 bg-border" />
            <Button
              variant={allTxnAmountSort === "newest" ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-9 shrink-0 rounded-full px-4 text-xs min-w-[80px] touch-manipulation",
                allTxnAmountSort !== "newest" && "border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950"
              )}
              onClick={() => {
                haptics.light();
                setAllTxnAmountSort("newest");
              }}
            >
              <ArrowDown className="mr-1 h-3 w-3" />
              Newest
            </Button>
            <Button
              variant={allTxnAmountSort === "oldest" ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-9 shrink-0 rounded-full px-4 text-xs min-w-[80px] touch-manipulation",
                allTxnAmountSort !== "oldest" && "border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950"
              )}
              onClick={() => {
                haptics.light();
                setAllTxnAmountSort("oldest");
              }}
            >
              <ArrowUp className="mr-1 h-3 w-3" />
              Oldest
            </Button>
            <Button
              variant={allTxnAmountSort === "highest" ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-9 shrink-0 rounded-full px-4 text-xs min-w-[80px] touch-manipulation",
                allTxnAmountSort !== "highest" && "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
              )}
              onClick={() => {
                haptics.light();
                setAllTxnAmountSort("highest");
              }}
            >
              <TrendingUp className="mr-1 h-3 w-3" />
              Max ₹
            </Button>
            <Button
              variant={allTxnAmountSort === "lowest" ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-9 shrink-0 rounded-full px-4 text-xs min-w-[80px] touch-manipulation",
                allTxnAmountSort !== "lowest" && "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
              )}
              onClick={() => {
                haptics.light();
                setAllTxnAmountSort("lowest");
              }}
            >
              <TrendingDown className="mr-1 h-3 w-3" />
              Min ₹
            </Button>
            <div className="mx-1 h-9 w-px shrink-0 bg-border" />

            <Button
              variant={allTxnStatusFilter === "pending" ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-9 shrink-0 rounded-full px-4 text-xs min-w-[100px] touch-manipulation",
                allTxnStatusFilter !== "pending" && "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950"
              )}
              onClick={() => {
                haptics.light();
                setAllTxnStatusFilter("pending");
              }}
            >
              <Clock className="mr-1 h-3 w-3" />
              Pending
            </Button>
            <Button
              variant={allTxnStatusFilter === "partial" ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-9 shrink-0 rounded-full px-4 text-xs min-w-[100px] touch-manipulation",
                allTxnStatusFilter !== "partial" && "border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950"
              )}
              onClick={() => {
                haptics.light();
                setAllTxnStatusFilter("partial");
              }}
            >
              Partial
            </Button>
            <Button
              variant={allTxnStatusFilter === "paid" ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-9 shrink-0 rounded-full px-4 text-xs min-w-[120px] touch-manipulation",
                allTxnStatusFilter !== "paid" && "border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
              )}
              onClick={() => {
                haptics.light();
                setAllTxnStatusFilter("paid");
              }}
            >
              <CheckCircle className="mr-1 h-3 w-3" />
              All Paid Up
            </Button>
            {/* Vyapari filter as autocomplete */}
            <Autocomplete
              options={[{ id: "all", companyName: "All Vyapari" }, ...suppliers]}
              value={allTxnSupplierFilter}
              onValueChange={(val) => {
                haptics.light();
                setAllTxnSupplierFilter(val || "all");
              }}
              placeholder="All Vyapari"
              searchPlaceholder="Search vyapari..."
              emptyText="No vyapari found"
              className="w-[160px] shrink-0"
              triggerClassName="h-9 rounded-full border-dashed px-3 text-xs touch-manipulation"
              getOptionLabel={(opt) => opt?.companyName || opt?.name || ""}
              getOptionValue={(opt) => opt?.id || ""}
            />
          </div>

          {/* Stats + View toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge 
                key={`${allFilteredTransactions.length}-${allTxnStatusFilter}-${allTxnAmountSort}`}
                variant="secondary" 
                className="text-xs animate-pop-in"
              >
                {allFilteredTransactions.length} transaction{allFilteredTransactions.length !== 1 ? "s" : ""}
              </Badge>
              {(allTxnStatusFilter !== "all" || allTxnAmountSort !== "newest") && (
                <Badge variant="outline" className="text-xs text-muted-foreground animate-pop-in">
                  {allTxnStatusFilter !== "all" && allTxnStatusFilter}
                  {allTxnStatusFilter !== "all" && allTxnAmountSort !== "newest" && " · "}
                  {allTxnAmountSort !== "newest" && allTxnAmountSort}
                </Badge>
              )}
            </div>
          </div>

          {/* Sub-tabs for List and Bills view */}
          <Tabs value={allTxnSubTab} onValueChange={setAllTxnSubTab}>
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="list" className="gap-1.5 touch-manipulation">
                <Receipt className="h-4 w-4" />
                Transactions List
              </TabsTrigger>
              <TabsTrigger value="gallery" className="gap-1.5 touch-manipulation">
                <Badge className="text-xs">
                  <ImageIcon className="h-4 w-4 mr-1" />
                  {totalBillsCount} Bills
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="mt-3">
              {allFilteredTransactions.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Receipt className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="font-medium">
                    {allTxnStatusFilter === "pending" && "No pending transactions"}
                    {allTxnStatusFilter === "partial" && "No partially paid transactions"}
                    {allTxnStatusFilter === "paid" && "No paid transactions"}
                    {allTxnStatusFilter === "all" && "No transactions yet"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {allTxnStatusFilter !== "all" ? "Try a different filter" : "Add transactions to see them here"}
                  </p>
                  {allTxnStatusFilter !== "all" && (
                    <Button variant="outline" size="sm" className="mt-3 touch-manipulation" onClick={() => setAllTxnStatusFilter("all")}>
                      Show all
                    </Button>
                  )}
                </div>
              ) : (
                <TransactionTable
                  transactions={allFilteredTransactions}
                  suppliers={suppliers}
                  loading={false}
                  onEdit={onEditTransaction}
                  onDelete={onDeleteTransaction}
                />
              )}
            </TabsContent>

            <TabsContent value="gallery" className="mt-4">
              <BillGallery transactions={allFilteredTransactions} suppliers={suppliers} />
            </TabsContent>
          </Tabs>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

