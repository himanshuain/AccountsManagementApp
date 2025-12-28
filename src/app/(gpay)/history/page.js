"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, ArrowUpRight, ArrowDownLeft, X, Store, Users } from "lucide-react";
import { format, parseISO, subMonths, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";

import { useSuppliers } from "@/hooks/useSuppliers";
import { useCustomers } from "@/hooks/useCustomers";
import { useTransactions } from "@/hooks/useTransactions";
import { useUdhar } from "@/hooks/useUdhar";

import { PersonAvatar } from "@/components/gpay/PersonAvatar";
import { cn } from "@/lib/utils";

const FILTER_OPTIONS = [
  { id: "all", label: "All" },
  { id: "suppliers", label: "Suppliers" },
  { id: "customers", label: "Customers" },
  { id: "pending", label: "Pending" },
  { id: "paid", label: "Paid" },
];

const TIME_FILTERS = [
  { id: "all", label: "All Time" },
  { id: "this-month", label: "This Month" },
  { id: "last-month", label: "Last Month" },
  { id: "last-3-months", label: "Last 3 Months" },
];

export default function HistoryPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Data hooks
  const { suppliers } = useSuppliers();
  const { customers } = useCustomers();
  const { transactions } = useTransactions();
  const { udharList } = useUdhar();

  // Combine and filter all transactions
  const allTransactions = useMemo(() => {
    const txns = [];

    // Add supplier transactions
    transactions.forEach(t => {
      const supplier = suppliers.find(s => s.id === t.supplierId);
      txns.push({
        id: t.id,
        type: "supplier",
        personId: t.supplierId,
        personName: supplier?.companyName || supplier?.name || "Unknown",
        personImage: supplier?.profilePicture,
        amount: Number(t.amount) || 0,
        date: t.date,
        description: t.description || t.itemName,
        status: t.paymentStatus,
        isOutgoing: true,
      });
    });

    // Add customer udhar
    udharList.forEach(u => {
      const customer = customers.find(c => c.id === u.customerId);
      txns.push({
        id: u.id,
        type: "customer",
        personId: u.customerId,
        personName: customer?.name || "Unknown",
        personImage: customer?.profilePicture,
        amount: Number(u.amount) || 0,
        date: u.date,
        description: u.description,
        status: u.status,
        isOutgoing: false,
      });
    });

    // Sort by date (newest first)
    return txns.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, udharList, suppliers, customers]);

  // Apply filters
  const filteredTransactions = useMemo(() => {
    let result = allTransactions;

    // Type filter
    if (activeFilter === "suppliers") {
      result = result.filter(t => t.type === "supplier");
    } else if (activeFilter === "customers") {
      result = result.filter(t => t.type === "customer");
    } else if (activeFilter === "pending") {
      result = result.filter(t => t.status !== "paid");
    } else if (activeFilter === "paid") {
      result = result.filter(t => t.status === "paid");
    }

    // Time filter
    const now = new Date();
    if (timeFilter === "this-month") {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      result = result.filter(t => isWithinInterval(parseISO(t.date), { start, end }));
    } else if (timeFilter === "last-month") {
      const lastMonth = subMonths(now, 1);
      const start = startOfMonth(lastMonth);
      const end = endOfMonth(lastMonth);
      result = result.filter(t => isWithinInterval(parseISO(t.date), { start, end }));
    } else if (timeFilter === "last-3-months") {
      const threeMonthsAgo = subMonths(now, 3);
      result = result.filter(t => new Date(t.date) >= threeMonthsAgo);
    }

    // Search filter (name, description, and amount)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const numQuery = parseFloat(query.replace(/[₹,\s]/g, ""));
      
      result = result.filter(t => {
        // Match by name or description
        if (t.personName?.toLowerCase().includes(query) ||
            t.description?.toLowerCase().includes(query)) {
          return true;
        }
        // Match by amount if search looks like a number
        if (!isNaN(numQuery)) {
          const amountStr = String(t.amount);
          return amountStr.includes(query.replace(/[₹,\s]/g, ""));
        }
        return false;
      });
    }

    return result;
  }, [allTransactions, activeFilter, timeFilter, searchQuery]);

  // Group by month for display
  const groupedTransactions = useMemo(() => {
    const groups = {};
    
    filteredTransactions.forEach(txn => {
      const monthKey = format(parseISO(txn.date), "yyyy-MM");
      const monthLabel = format(parseISO(txn.date), "MMMM yyyy");
      
      if (!groups[monthKey]) {
        groups[monthKey] = {
          key: monthKey,
          label: monthLabel,
          transactions: [],
          totalIn: 0,
          totalOut: 0,
        };
      }
      
      groups[monthKey].transactions.push(txn);
      
      if (txn.isOutgoing) {
        groups[monthKey].totalOut += txn.amount;
      } else {
        groups[monthKey].totalIn += txn.amount;
      }
    });
    
    return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
  }, [filteredTransactions]);

  // Summary stats
  const stats = useMemo(() => {
    const totalOut = filteredTransactions.filter(t => t.isOutgoing).reduce((sum, t) => sum + t.amount, 0);
    const totalIn = filteredTransactions.filter(t => !t.isOutgoing).reduce((sum, t) => sum + t.amount, 0);
    const pending = filteredTransactions.filter(t => t.status !== "paid").reduce((sum, t) => sum + t.amount, 0);
    
    return { totalOut, totalIn, pending, count: filteredTransactions.length };
  }, [filteredTransactions]);

  // Check if any filters are active
  const hasActiveFilters = activeFilter !== "all" || timeFilter !== "all" || searchQuery.trim();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background">
        {/* Search */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search name or amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-hero pl-12 pr-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-accent text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "p-3 rounded-xl transition-colors flex-shrink-0 relative",
                showFilters ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"
              )}
            >
              <SlidersHorizontal className="h-5 w-5" />
              {/* Active filter indicator */}
              {hasActiveFilters && !showFilters && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
              )}
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        {showFilters && (
          <div className="px-4 py-3 space-y-3 animate-slide-up border-b border-border bg-background">
            {/* Type filters */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Type</p>
              <div className="flex gap-2 overflow-x-hidden flex-wrap">
                {FILTER_OPTIONS.map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                      activeFilter === filter.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time filters */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Time Period</p>
              <div className="flex gap-2 overflow-x-hidden flex-wrap">
                {TIME_FILTERS.map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setTimeFilter(filter.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                      timeFilter === filter.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setActiveFilter("all");
                  setTimeFilter("all");
                  setSearchQuery("");
                }}
                className="text-sm text-primary font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Summary Stats */}
        <div className="px-4 py-3 border-b border-border bg-background">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">{stats.count} transactions</span>
              {stats.pending > 0 && (
                <span className="status-pending font-mono font-medium">₹{stats.pending.toLocaleString("en-IN")} pending</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="overflow-y-auto overflow-x-hidden">
        {groupedTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-muted-foreground mb-2">No transactions found</p>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilter("all");
                  setTimeFilter("all");
                }}
                className="text-primary text-sm font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          groupedTransactions.map(group => (
            <div key={group.key}>
              {/* Month Header */}
              <div className="sticky top-0 z-10 bg-background px-4 py-4 flex items-center justify-between border-b border-border">
                <span className="font-heading text-lg tracking-wide">{group.label}</span>
                <span className={cn(
                  "font-mono font-bold",
                  group.totalIn > group.totalOut ? "amount-positive" : "amount-negative"
                )}>
                  {group.totalIn > group.totalOut ? "Need to Receive " : "Need to Pay "}{group.totalIn > group.totalOut ? "+" : "-"}₹{Math.abs(group.totalIn - group.totalOut).toLocaleString("en-IN")}
                </span>
              </div>

              {/* Transactions */}
              <div className="divide-y divide-border">
                {group.transactions.map(txn => (
                  <div
                    key={`${txn.type}-${txn.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer active:scale-[0.99]"
                    onClick={() => router.push(`/person/${txn.type}/${txn.personId}`)}
                  >
                    <PersonAvatar
                      name={txn.personName}
                      image={txn.personImage}
                      size="md"
                      className="avatar-hero"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{txn.personName}</p>
                        {/* Type badge - Supplier or Customer */}
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-0.5",
                          txn.type === "supplier" ? "badge-supplier" : "badge-customer"
                        )}>
                          {txn.type === "supplier" ? (
                            <><Store className="h-2.5 w-2.5" /> Supplier</>
                          ) : (
                            <><Users className="h-2.5 w-2.5" /> Customer</>
                          )}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {format(parseISO(txn.date), "dd MMM, h:mm a")}
                        {txn.description && ` • ${txn.description}`}
                      </p>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 font-mono font-semibold">
                        {txn.isOutgoing ? (
                          <ArrowUpRight className={cn("h-4 w-4", txn.status === "paid" ? "amount-positive" : "amount-negative")} />
                        ) : (
                          <ArrowDownLeft className={cn("h-4 w-4", txn.status === "paid" ? "amount-positive" : "amount-negative")} />
                        )}
                        <span className={txn.status === "paid" ?  "amount-positive": "amount-negative"}>
                          ₹{txn.amount.toLocaleString("en-IN")}
                        </span>
                      </div>
                      {/* Status badge - Paid (green) or Pending (orange) */}
                      <span className={cn(
                        "text-[10px] font-medium",
                        txn.status === "paid" ? "status-paid" : "status-pending"
                      )}>
                        {txn.status === "paid" ? "Paid" : "Pending"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
