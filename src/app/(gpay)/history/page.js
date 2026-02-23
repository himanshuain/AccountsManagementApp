"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  X,
  Store,
  Users,
  ChevronDown,
} from "lucide-react";
import {
  format,
  parseISO,
  subMonths,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
} from "date-fns";

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

function TimelineItem({ txn, isLast, onClick }) {
  const isPaid = txn.status === "paid";
  const dateStr = format(parseISO(txn.time || txn.date), "dd MMM, h:mm a");
  const label = txn.description || txn.itemName;

  return (
    <div
      className="relative flex cursor-pointer gap-3 rounded-lg px-2 py-1.5 transition-colors active:bg-accent/40"
      onClick={onClick}
    >
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full",
            isPaid ? "bg-emerald-500" : "bg-amber-500"
          )}
        />
        {!isLast && <div className="mt-1 w-px flex-1 bg-border/60" />}
      </div>

      {/* Content */}
      <div className={cn("min-w-0 flex-1", !isLast && "pb-3")}>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs text-muted-foreground">{dateStr}</p>
          <p
            className={cn(
              "flex-shrink-0 font-mono text-sm font-semibold tabular-nums",
              isPaid ? "amount-positive" : "amount-negative"
            )}
          >
            ₹{txn.amount.toLocaleString("en-IN")}
          </p>
        </div>
        {label && (
          <p className="mt-0.5 truncate text-[13px] text-foreground/80">{label}</p>
        )}
      </div>
    </div>
  );
}

function PersonHistoryCard({ person, onTimelineItemClick }) {
  const [expanded, setExpanded] = useState(false);
  const txnCount = person.transactions.length;

  return (
    <div className="border-b border-border">
      {/* Person header */}
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors active:bg-accent/30"
        onClick={() => setExpanded(prev => !prev)}
      >
        <PersonAvatar
          name={person.name}
          image={person.image}
          size="md"
          className="avatar-hero"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight">{person.name}</p>
          <div className="mt-1 flex items-center gap-1.5 text-[11px]">
            {person.type === "supplier" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 font-medium text-emerald-500">
                <Store className="h-2.5 w-2.5" /> Supplier
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-1.5 py-0.5 font-medium text-rose-500">
                <Users className="h-2.5 w-2.5" /> Customer
              </span>
            )}
            <span className="text-muted-foreground">{txnCount} bills</span>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5">
          <div className="text-right">
            <p
              className={cn(
                "font-mono text-[15px] font-bold tabular-nums",
                person.totalPending > 0 ? "amount-negative" : "amount-positive"
              )}
            >
              ₹{(person.totalPending > 0
                ? person.totalPending
                : person.totalAmount
              ).toLocaleString("en-IN")}
            </p>
            <span
              className={cn(
                "text-[10px] font-medium",
                person.totalPending > 0 ? "status-pending" : "status-paid"
              )}
            >
              {person.totalPending > 0 ? "Pending" : "All Paid"}
            </span>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground/60 transition-transform duration-200",
              !expanded && "-rotate-90"
            )}
          />
        </div>
      </div>

      {/* Expandable timeline */}
      {expanded && (
        <div className="animate-slide-up border-t border-border/40 bg-muted/10 px-4 pb-2 pt-2">
          {person.transactions.map((txn, idx) => (
            <TimelineItem
              key={`${txn.type}-${txn.id}`}
              txn={txn}
              isLast={idx === person.transactions.length - 1}
              onClick={() => onTimelineItemClick(txn)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const { suppliers } = useSuppliers();
  const { customers } = useCustomers();
  const { transactions } = useTransactions(null, { fetchAll: true });
  const { udharList } = useUdhar({ fetchAll: true });

  const getLatestActivity = item => {
    let latest = new Date(item.updatedAt || item.createdAt || item.date || 0).getTime();
    (item.payments || []).forEach(p => {
      const paymentTime = new Date(p.date || 0).getTime();
      if (paymentTime > latest) latest = paymentTime;
    });
    return latest;
  };

  // Build flat transaction list (same as before for filtering)
  const allTransactions = useMemo(() => {
    const txns = [];

    transactions.forEach(t => {
      const supplier = suppliers.find(s => s.id === t.supplierId);
      const timeValue = t.date?.includes("T") ? t.date : t.createdAt || t.date;
      const lastActivity = getLatestActivity(t);
      txns.push({
        id: t.id,
        type: "supplier",
        personId: t.supplierId,
        personName: supplier?.companyName || supplier?.name || "Unknown",
        personImage: supplier?.profilePicture,
        amount: Number(t.amount) || 0,
        date: t.date,
        time: timeValue,
        lastActivity,
        description: t.description || t.itemName,
        itemName: t.itemName,
        status: t.paymentStatus,
        isOutgoing: true,
      });
    });

    udharList.forEach(u => {
      const customer = customers.find(c => c.id === u.customerId);
      const timeValue = u.date?.includes("T") ? u.date : u.createdAt || u.date;
      const lastActivity = getLatestActivity(u);
      txns.push({
        id: u.id,
        type: "customer",
        personId: u.customerId,
        personName: customer?.name || "Unknown",
        personImage: customer?.profilePicture,
        amount: Number(u.amount) || 0,
        date: u.date,
        time: timeValue,
        lastActivity,
        description: u.description || u.itemDescription,
        itemName: u.itemDescription,
        status: u.paymentStatus || u.status,
        isOutgoing: false,
      });
    });

    return txns.sort((a, b) => b.lastActivity - a.lastActivity);
  }, [transactions, udharList, suppliers, customers]);

  // Apply filters
  const filteredTransactions = useMemo(() => {
    let result = allTransactions;

    if (activeFilter === "suppliers") {
      result = result.filter(t => t.type === "supplier");
    } else if (activeFilter === "customers") {
      result = result.filter(t => t.type === "customer");
    } else if (activeFilter === "pending") {
      result = result.filter(t => t.status !== "paid");
    } else if (activeFilter === "paid") {
      result = result.filter(t => t.status === "paid");
    }

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

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const numQuery = parseFloat(query.replace(/[₹,\s]/g, ""));

      result = result.filter(t => {
        if (
          t.personName?.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
        ) {
          return true;
        }
        if (!isNaN(numQuery)) {
          const amountStr = String(t.amount);
          return amountStr.includes(query.replace(/[₹,\s]/g, ""));
        }
        return false;
      });
    }

    return result;
  }, [allTransactions, activeFilter, timeFilter, searchQuery]);

  // Group filtered transactions by person
  const personGroups = useMemo(() => {
    const map = new Map();

    filteredTransactions.forEach(txn => {
      const key = `${txn.type}-${txn.personId}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          personId: txn.personId,
          type: txn.type,
          name: txn.personName,
          image: txn.personImage,
          transactions: [],
          totalAmount: 0,
          totalPending: 0,
          latestActivity: 0,
        });
      }

      const group = map.get(key);
      group.transactions.push(txn);
      group.totalAmount += txn.amount;
      if (txn.status !== "paid") {
        group.totalPending += txn.amount;
      }
      if (txn.lastActivity > group.latestActivity) {
        group.latestActivity = txn.lastActivity;
      }
    });

    // Sort transactions within each person by date (newest first for timeline)
    for (const group of map.values()) {
      group.transactions.sort((a, b) => b.lastActivity - a.lastActivity);
    }

    // Sort persons by latest activity (most recent first)
    return Array.from(map.values()).sort(
      (a, b) => b.latestActivity - a.latestActivity
    );
  }, [filteredTransactions]);

  const stats = useMemo(() => {
    const totalTxns = filteredTransactions.length;
    const personCount = personGroups.length;
    return { totalTxns, personCount };
  }, [filteredTransactions, personGroups]);

  const hasActiveFilters =
    activeFilter !== "all" || timeFilter !== "all" || searchQuery.trim();

  const handleTimelineItemClick = txn => {
    router.push(`/person/${txn.type}/${txn.personId}?txnId=${txn.id}`);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="header-glass sticky top-0 z-20">
        {/* Search */}
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search name or amount..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input-hero pl-12 pr-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-accent"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "relative flex-shrink-0 rounded-xl p-3 transition-colors",
                showFilters
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-accent"
              )}
            >
              <SlidersHorizontal className="h-5 w-5" />
              {hasActiveFilters && !showFilters && (
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
              )}
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        {showFilters && (
          <div className="animate-slide-up space-y-3 border-b border-border px-4 py-3">
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Type</p>
              <div className="flex flex-wrap gap-2 overflow-x-hidden">
                {FILTER_OPTIONS.map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    className={cn(
                      "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
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

            <div>
              <p className="mb-2 text-xs text-muted-foreground">Time Period</p>
              <div className="flex flex-wrap gap-2 overflow-x-hidden">
                {TIME_FILTERS.map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => setTimeFilter(filter.id)}
                    className={cn(
                      "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
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

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setActiveFilter("all");
                  setTimeFilter("all");
                  setSearchQuery("");
                }}
                className="text-sm font-medium text-primary"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* Summary Stats */}
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">
                {stats.personCount} {stats.personCount === 1 ? "person" : "people"}
              </span>
              <span className="text-muted-foreground/50">·</span>
              <span className="text-muted-foreground">
                {stats.totalTxns} {stats.totalTxns === 1 ? "transaction" : "transactions"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Person-wise Transaction List */}
      <div className="overflow-y-auto overflow-x-hidden">
        {personGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="mb-2 text-muted-foreground">No transactions found</p>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilter("all");
                  setTimeFilter("all");
                }}
                className="text-sm font-medium text-primary"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          personGroups.map(person => (
            <PersonHistoryCard
              key={person.key}
              person={person}
              onTimelineItemClick={handleTimelineItemClick}
            />
          ))
        )}
      </div>
    </div>
  );
}
