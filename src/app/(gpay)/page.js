"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  SlidersHorizontal,
  ArrowDownAZ,
  Clock,
  IndianRupee,
  X,
  Users,
  Store,
  ChevronDown,
  PiggyBank,
  ArrowUpRight,
  ArrowDownLeft,
  Settings,
  Search,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { useSuppliers } from "@/hooks/useSuppliers";
import { useCustomers } from "@/hooks/useCustomers";
import { useTransactions } from "@/hooks/useTransactions";
import { useUdhar } from "@/hooks/useUdhar";
import { useIncome } from "@/hooks/useIncome";
import { usePreventBodyScroll } from "@/hooks/usePreventBodyScroll";

import { PersonListItem } from "@/components/gpay/PersonAvatar";
import { IncomeQuickModal } from "@/components/gpay/IncomeQuickModal";
import { SupplierForm } from "@/components/SupplierForm";
import { CustomerForm } from "@/components/CustomerForm";
import { TransactionForm } from "@/components/TransactionForm";
import { UdharForm } from "@/components/UdharForm";
import { cn } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/image-url";
import { getLocalDate } from "@/lib/date-utils";
import { getSupplierPurchaseStats } from "@/lib/transaction-amounts";
import { PersonListCardSkeleton } from "@/components/gpay/GPaySkeletons";

/** Supplier / Customer quick-add — emerald plus matches pay / positive actions. */
function AddPersonTypeCard({ icon: Icon, title, subtitle, onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "theme-card flex flex-col items-start p-4 text-left transition-colors hover:border-emerald-500/35",
        className
      )}
    >
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-500/30 dark:bg-emerald-500">
        <Plus className="h-7 w-7" strokeWidth={2.25} />
      </div>
      <div className="flex items-center gap-1.5">
        <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
        <p className="font-medium">{title}</p>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
    </button>
  );
}

// Filter Chip Component
function FilterChip({ active, onClick, children, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-accent"
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}

// Sort Options
const SORT_OPTIONS = [
  { id: "amount", label: "Amount", icon: IndianRupee },
  { id: "name", label: "Name", icon: ArrowDownAZ },
  { id: "recent", label: "Recent", icon: Clock },
];

// Filter Options
const FILTER_OPTIONS = [
  { id: "all", label: "All", icon: Users },
  { id: "supplier", label: "Suppliers", icon: Store },
  { id: "customer", label: "Customers", icon: Users },
];

const SUPPLIER_PERIOD_OPTIONS = [
  { id: "all", label: "All time" },
  { id: "1year", label: "1 year" },
  { id: "6months", label: "6 months" },
  { id: "3months", label: "3 months" },
  { id: "1month", label: "1 month" },
];

function personMatchesSearch(person, rawQuery) {
  const trimmed = rawQuery.trim();
  if (!trimmed) return true;

  const query = trimmed.toLowerCase();
  const numQuery = parseFloat(query.replace(/[₹,\s]/g, ""));
  const phoneDigits = (person.phone || "").replace(/\D/g, "");
  const queryDigits = query.replace(/\D/g, "");

  if (person.name?.toLowerCase().includes(query)) return true;
  if (person.phone?.includes(trimmed)) return true;
  if (queryDigits && phoneDigits.includes(queryDigits)) return true;
  if (!isNaN(numQuery) && person.pendingAmount > 0) {
    return String(person.pendingAmount).includes(query.replace(/[₹,\s]/g, ""));
  }
  return false;
}

function AppliedFilterPill({ label, onRemove }) {
  return (
    <span className="inline-flex max-w-[min(100%,14rem)] items-center gap-1 rounded-full border border-primary/25 bg-primary/10 py-1 pl-2.5 pr-1 text-xs font-medium text-primary">
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded-full p-0.5 transition-colors hover:bg-primary/20 active:scale-95"
        aria-label={`Remove filter ${label}`}
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </span>
  );
}

export default function GPayHomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchPickerOpen, setSearchPickerOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("amount");
  const [filterBy, setFilterBy] = useState("all");

  // Form states
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [udharFormOpen, setUdharFormOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);

  // Section collapse states
  const [suppliersExpanded, setSuppliersExpanded] = useState(true);
  const [customersExpanded, setCustomersExpanded] = useState(true);
  const [supplierSpendingExpanded, setSupplierSpendingExpanded] = useState(false);
  const [supplierPeriod, setSupplierPeriod] = useState("all");

  // Prevent body scroll when modal is open
  usePreventBodyScroll(addMenuOpen || incomeModalOpen);

  // Data hooks - fetchAll: true loads all data in one request for accurate calculations
  const { suppliers, addSupplier, loading: suppliersLoading } = useSuppliers({ fetchAll: true });
  const { customers, addCustomer, loading: customersLoading } = useCustomers({ fetchAll: true });
  const {
    transactions,
    addTransaction,
    loading: transactionsLoading,
  } = useTransactions(null, { fetchAll: true });
  const { udharList, addUdhar, loading: udharLoading } = useUdhar({ fetchAll: true });
  const { addIncome, updateIncome, incomeList } = useIncome();

  // Fetch aggregated stats from API (totals without loading all data)
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const response = await fetch("/api/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      const result = await response.json();
      return result.data;
    },
    staleTime: 1000 * 30, // 30 seconds - refresh more often
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Combine suppliers and customers for "People" grid
  const allPeople = useMemo(() => {
    const people = [];

    // Add suppliers with pending amounts
    suppliers.forEach(s => {
      const supplierTxns = transactions.filter(t => t.supplierId === s.id);
      const pendingAmount = supplierTxns
        .filter(t => t.paymentStatus !== "paid")
        .reduce((sum, t) => {
          const amount = Number(t.amount) || 0;
          const paid = Number(t.paidAmount) || 0;
          return sum + Math.max(0, amount - paid);
        }, 0);

      people.push({
        id: s.id,
        name: s.companyName || s.name,
        image: s.profilePicture,
        type: "supplier",
        pendingAmount,
        phone: s.phone,
        upiId: s.upiId,
        lastActivity: supplierTxns[0]?.date,
        createdAt: s.createdAt,
      });
    });

    // Add customers with pending udhar
    customers.forEach(c => {
      const customerUdhar = udharList.filter(u => u.customerId === c.id);
      const pendingAmount = customerUdhar
        .filter(u => u.status !== "paid")
        .reduce((sum, u) => {
          const amount =
            Number(u.amount) || (Number(u.cashAmount) || 0) + (Number(u.onlineAmount) || 0);
          const paid =
            Number(u.paidAmount) || (Number(u.paidCash) || 0) + (Number(u.paidOnline) || 0);
          return sum + Math.max(0, amount - paid);
        }, 0);

      people.push({
        id: c.id,
        name: c.name,
        image: c.profilePicture,
        type: "customer",
        pendingAmount,
        phone: c.phone,
        upiId: c.upiId,
        lastActivity: customerUdhar[0]?.date,
        createdAt: c.createdAt,
      });
    });

    return people;
  }, [suppliers, customers, transactions, udharList]);

  const suppliersList = useMemo(() => {
    let result = allPeople.filter(p => p.type === "supplier");

    if (searchQuery.trim()) {
      result = result.filter(p => personMatchesSearch(p, searchQuery));
    }

    // Apply sorting only
    switch (sortBy) {
      case "amount":
        result.sort((a, b) => b.pendingAmount - a.pendingAmount);
        break;
      case "name":
        result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "recent":
        result.sort(
          (a, b) =>
            new Date(b.lastActivity || b.createdAt || 0) -
            new Date(a.lastActivity || a.createdAt || 0)
        );
        break;
    }

    return result;
  }, [allPeople, sortBy, searchQuery]);

  const customersList = useMemo(() => {
    let result = allPeople.filter(p => p.type === "customer");

    if (searchQuery.trim()) {
      result = result.filter(p => personMatchesSearch(p, searchQuery));
    }

    // Apply sorting only
    switch (sortBy) {
      case "amount":
        result.sort((a, b) => b.pendingAmount - a.pendingAmount);
        break;
      case "name":
        result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "recent":
        result.sort(
          (a, b) =>
            new Date(b.lastActivity || b.createdAt || 0) -
            new Date(a.lastActivity || a.createdAt || 0)
        );
        break;
    }

    return result;
  }, [allPeople, sortBy, searchQuery]);

  const activeFilterPills = useMemo(() => {
    const pills = [];
    const q = searchQuery.trim();

    if (q) {
      const display = q.length > 24 ? `${q.slice(0, 24)}…` : q;
      pills.push({ id: "search", label: `Search: ${display}` });
    }

    if (filterBy !== "all") {
      const opt = FILTER_OPTIONS.find(o => o.id === filterBy);
      pills.push({ id: "type", label: opt?.label ?? filterBy });
    }

    if (sortBy !== "amount") {
      const opt = SORT_OPTIONS.find(o => o.id === sortBy);
      pills.push({ id: "sort", label: `Sort: ${opt?.label ?? sortBy}` });
    }

    if (supplierPeriod !== "all") {
      const opt = SUPPLIER_PERIOD_OPTIONS.find(o => o.id === supplierPeriod);
      pills.push({ id: "period", label: `Spending: ${opt?.label ?? supplierPeriod}` });
    }

    return pills;
  }, [searchQuery, filterBy, sortBy, supplierPeriod]);

  const hasActiveFilters = activeFilterPills.length > 0;

  const clearActiveFilter = id => {
    switch (id) {
      case "search":
        setSearchQuery("");
        setSearchPickerOpen(false);
        break;
      case "type":
        setFilterBy("all");
        break;
      case "sort":
        setSortBy("amount");
        break;
      case "period":
        setSupplierPeriod("all");
        break;
      default:
        break;
    }
  };

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchPickerOpen(false);
  }, []);

  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];
    return allPeople.filter(p => personMatchesSearch(p, searchQuery)).slice(0, 12);
  }, [allPeople, searchQuery]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchPickerOpen(false);
      return;
    }
    if (searchSuggestions.length > 0) {
      setSearchPickerOpen(true);
    } else {
      setSearchPickerOpen(false);
    }
  }, [searchQuery, searchSuggestions.length]);

  const showSearchMenu = searchPickerOpen && searchSuggestions.length > 0;

  const closeSearchPicker = useCallback(() => setSearchPickerOpen(false), []);

  const openPersonFromSearch = useCallback(
    person => {
      setSearchQuery("");
      router.push(`/person/${person.type}/${person.id}`);
    },
    [router]
  );

  // Statistics - Use API data for accurate totals, fall back to loaded data
  const stats = useMemo(() => {
    if (statsData) {
      return {
        supplierCount: statsData.supplierCount,
        customerCount: statsData.customerCount,
        totalSupplierPending: statsData.totalSupplierPending,
        totalCustomerPending: statsData.totalCustomerPending,
      };
    }

    // Fallback to loaded data while API loads
    const totalSupplierPending = allPeople
      .filter(p => p.type === "supplier")
      .reduce((sum, p) => sum + p.pendingAmount, 0);
    const totalCustomerPending = allPeople
      .filter(p => p.type === "customer")
      .reduce((sum, p) => sum + p.pendingAmount, 0);

    return {
      supplierCount: suppliers.length,
      customerCount: customers.length,
      totalSupplierPending,
      totalCustomerPending,
    };
  }, [statsData, allPeople, suppliers.length, customers.length]);

  const supplierPurchaseStats = useMemo(
    () => getSupplierPurchaseStats(transactions, supplierPeriod),
    [transactions, supplierPeriod]
  );

  // Handlers
  const handleAddSupplier = async data => {
    const result = await addSupplier(data);
    if (result.success) {
      toast.success("Supplier added");
      setSupplierFormOpen(false);
      if (result.data?.id) {
        router.push(`/person/supplier/${result.data.id}`);
      }
    } else {
      toast.error(result.error || "Failed to add supplier");
    }
  };

  const handleAddCustomer = async data => {
    const result = await addCustomer(data);
    if (result.success) {
      toast.success("Customer added");
      setCustomerFormOpen(false);
      if (result.data?.id) {
        router.push(`/person/customer/${result.data.id}`);
      }
    } else {
      toast.error(result.error || "Failed to add customer");
    }
  };

  const handleAddTransaction = async data => {
    const result = await addTransaction(data);
    if (result.success) {
      toast.success("Transaction added");
      setTransactionFormOpen(false);
    } else {
      toast.error(result.error || "Failed to add transaction");
    }
  };

  const handleAddUdhar = async data => {
    const result = await addUdhar(data);
    if (result.success) {
      toast.success("Udhar added");
      setUdharFormOpen(false);
    } else {
      toast.error(result.error || "Failed to add udhar");
    }
  };

  const isLoading = suppliersLoading || customersLoading || transactionsLoading || udharLoading;
  const isStatsLoading = statsLoading && !statsData;

  return (
    <div className="min-h-dvh lg:mx-auto lg:max-w-6xl xl:max-w-7xl">
      <AnimatePresence>
        {showSearchMenu && (
          <motion.button
            type="button"
            key="search-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[25] bg-black/30"
            aria-label="Close suggestions"
            onClick={closeSearchPicker}
          />
        )}
      </AnimatePresence>

      {/* Search Bar */}
      <div className="header-glass sticky top-0 z-30 overflow-visible border-b border-border px-4 py-3">
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                strokeWidth={2}
                aria-hidden
              />
              <input
                type="text"
                role="searchbox"
                enterKeyHint="search"
                placeholder="Search name or amount..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchSuggestions.length > 0) setSearchPickerOpen(true);
                }}
                onKeyDown={e => {
                  if (e.key === "Escape") {
                    if (searchPickerOpen) closeSearchPicker();
                    else clearSearch();
                  }
                }}
                className={cn("input-hero pl-11", searchQuery ? "pr-11" : "pr-4")}
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "relative shrink-0 rounded-xl p-3 transition-colors",
                showFilters ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"
              )}
            >
              <SlidersHorizontal className="h-5 w-5" />
              {hasActiveFilters && !showFilters && (
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-primary ring-2 ring-background" />
              )}
            </button>
            <Link
              href="/settings"
              className="flex-shrink-0 rounded-xl bg-muted p-3 transition-colors hover:bg-accent"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>

          <AnimatePresence>
            {showSearchMenu && (
              <motion.div
                key="search-suggestions"
                role="listbox"
                aria-label="Search suggestions"
                initial={{ opacity: 0, y: -6, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.995 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                className="search-suggestions-panel absolute left-0 right-0 top-full z-50 mt-2 w-full origin-top divide-y divide-black/[0.06] dark:divide-white/[0.06]"
              >
                {searchSuggestions.map(person => (
                  <button
                    key={`suggest-${person.type}-${person.id}`}
                    type="button"
                    onClick={() => openPersonFromSearch(person)}
                    className="search-suggestions-panel__item flex w-full items-center gap-3 px-3 py-2.5 text-left"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                      {person.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveImageUrl(person.image)}
                          alt={person.name || "Avatar"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground">
                          {(person.name || "?").slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{person.name}</p>
                      {person.phone && (
                        <p className="truncate text-[10px] text-muted-foreground">{person.phone}</p>
                      )}
                    </div>
                    <span className="badge-role shrink-0">
                      {person.type === "supplier" ? "Supplier" : "Customer"}
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Filter & Sort Options */}
        {showFilters && (
          <div className="animate-slide-up mt-3 space-y-3">
            {/* Type Filter */}
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Filter by</p>
              <div className="flex flex-wrap gap-2">
                {FILTER_OPTIONS.map(opt => (
                  <FilterChip
                    key={opt.id}
                    active={filterBy === opt.id}
                    onClick={() => setFilterBy(opt.id)}
                    icon={opt.icon}
                  >
                    {opt.label}
                  </FilterChip>
                ))}
              </div>
            </div>

            {/* Sort Options */}
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Sort by</p>
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map(opt => (
                  <FilterChip
                    key={opt.id}
                    active={sortBy === opt.id}
                    onClick={() => setSortBy(opt.id)}
                    icon={opt.icon}
                  >
                    {opt.label}
                  </FilterChip>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeFilterPills.length > 0 && !showSearchMenu && (
          <div className="mt-2 flex flex-wrap gap-1.5 pb-0.5 pt-1">
            {activeFilterPills.map(pill => (
              <AppliedFilterPill
                key={pill.id}
                label={pill.label}
                onRemove={() => clearActiveFilter(pill.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Supplier purchase & payments */}
      <section className="px-4 pt-4 pb-1">
        <button
          type="button"
          onClick={() => setSupplierSpendingExpanded(!supplierSpendingExpanded)}
          className="mb-2 flex w-full items-center justify-between gap-2"
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50">
              <Store className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0 text-left">
              <h2 className="text-sm font-semibold">Supplier spending</h2>
              {!supplierSpendingExpanded && !transactionsLoading && (
                <p className="truncate font-mono text-[11px] tabular-nums text-muted-foreground">
                  Purchases ₹{supplierPurchaseStats.totalPurchase.toLocaleString("en-IN")} · Paid ₹
                  {supplierPurchaseStats.totalPaid.toLocaleString("en-IN")}
                </p>
              )}
            </div>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              supplierSpendingExpanded && "rotate-180"
            )}
          />
        </button>

        <AnimatePresence initial={false}>
          {supplierSpendingExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="surface-panel p-4">
                <p className="mb-3 text-[10px] text-muted-foreground">
                  Purchase total vs amount paid
                </p>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {SUPPLIER_PERIOD_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setSupplierPeriod(opt.id);
                      }}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                        supplierPeriod === opt.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/80 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-background/60 px-3 py-2.5">
                    <p className="text-[10px] font-medium text-muted-foreground">Total purchases</p>
                    {transactionsLoading ? (
                      <div className="skeleton-hero mt-1 h-6 w-20 rounded" />
                    ) : (
                      <p className="font-mono text-base font-bold tabular-nums text-foreground">
                        ₹{supplierPurchaseStats.totalPurchase.toLocaleString("en-IN")}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground">Cost of goods / bills</p>
                  </div>
                  <div className="rounded-xl bg-background/60 px-3 py-2.5">
                    <p className="text-[10px] font-medium text-muted-foreground">Total paid</p>
                    {transactionsLoading ? (
                      <div className="skeleton-hero mt-1 h-6 w-20 rounded" />
                    ) : (
                      <p className="font-mono text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                        ₹{supplierPurchaseStats.totalPaid.toLocaleString("en-IN")}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground">Payments to suppliers</p>
                  </div>
                </div>
                {!transactionsLoading && supplierPurchaseStats.transactionCount > 0 && (
                  <p className="mt-2 text-center text-[10px] text-muted-foreground">
                    {supplierPurchaseStats.transactionCount} transaction
                    {supplierPurchaseStats.transactionCount !== 1 ? "s" : ""} in this period
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Stats Summary */}
      <div className="px-4 pt-2 pb-2">
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            className="stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0 }}
          >
            <ArrowUpRight className="mb-1.5 h-4 w-4 text-muted-foreground" />
            <p className="text-[11px] font-medium text-muted-foreground">You Owe</p>
            {isStatsLoading ? (
              <div className="skeleton-hero my-0.5 h-7 w-24 rounded-md" />
            ) : (
              <p className="amount-negative font-mono text-lg font-bold tabular-nums">
                ₹{stats.totalSupplierPending.toLocaleString("en-IN")}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground">{stats.supplierCount} suppliers</p>
          </motion.div>
          <motion.div
            className="stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <ArrowDownLeft className="mb-1.5 h-4 w-4 text-muted-foreground" />
            <p className="text-[11px] font-medium text-muted-foreground">They Owe</p>
            {isStatsLoading ? (
              <div className="skeleton-hero my-0.5 h-7 w-24 rounded" />
            ) : (
              <p className="font-mono text-lg font-semibold tabular-nums text-foreground">
                ₹{stats.totalCustomerPending.toLocaleString("en-IN")}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground">{stats.customerCount} customers</p>
          </motion.div>
        </div>
      </div>

      {/* Suppliers Section */}
      {(filterBy === "all" || filterBy === "supplier") && (
      <section className="mt-4 px-4">
        <button
          onClick={() => setSuppliersExpanded(!suppliersExpanded)}
          className="mb-2 flex w-full items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-muted/50">
              <Store className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <h2 className="text-sm font-semibold">Suppliers</h2>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {statsData?.supplierCount || suppliersList.length}
            </span>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              suppliersExpanded && "rotate-180"
            )}
          />
        </button>

        <AnimatePresence>
          {suppliersExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {isLoading ? (
                <PersonListCardSkeleton rows={4} />
              ) : suppliersList.length === 0 ? (
                <div className="py-2">
                  <p className="mb-3 text-center text-sm text-muted-foreground">No suppliers yet</p>
                  <AddPersonTypeCard
                    icon={Store}
                    title="Supplier"
                    subtitle="Add new vendor"
                    onClick={() => setSupplierFormOpen(true)}
                    className="w-full"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-border/50 bg-card/50 divide-y divide-border/40">
                  {suppliersList.map(person => (
                    <PersonListItem
                      key={`supplier-${person.id}`}
                      name={person.name}
                      image={person.image}
                      amount={person.pendingAmount > 0 ? person.pendingAmount : undefined}
                      amountColor="amount-negative"
                      href={`/person/supplier/${person.id}`}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      )}

      {/* Customers Section */}
      {(filterBy === "all" || filterBy === "customer") && (
      <section className="mt-5 px-4 pb-2">
        <button
          onClick={() => setCustomersExpanded(!customersExpanded)}
          className="mb-2 flex w-full items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-muted/50">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <h2 className="text-sm font-semibold">Customers</h2>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {statsData?.customerCount || customersList.length}
            </span>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              customersExpanded && "rotate-180"
            )}
          />
        </button>

        <AnimatePresence>
          {customersExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {isLoading ? (
                <PersonListCardSkeleton rows={4} />
              ) : customersList.length === 0 ? (
                <div className="py-2">
                  <p className="mb-3 text-center text-sm text-muted-foreground">No customers yet</p>
                  <AddPersonTypeCard
                    icon={Users}
                    title="Customer"
                    subtitle="Add new customer"
                    onClick={() => setCustomerFormOpen(true)}
                    className="w-full"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-border/50 bg-card/50 divide-y divide-border/40">
                  {customersList.map(person => (
                    <PersonListItem
                      key={`customer-${person.id}`}
                      name={person.name}
                      image={person.image}
                      amount={person.pendingAmount > 0 ? person.pendingAmount : undefined}
                      amountColor="text-foreground"
                      href={`/person/customer/${person.id}`}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      )}

      {/* Quick Action FAB */}
      <motion.button
        onClick={() => setAddMenuOpen(true)}
        className="fab-hero"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <Plus className="h-6 w-6" />
      </motion.button>

      {/* Add Menu Modal - Fixed with proper bottom padding */}
      <AnimatePresence>
        {addMenuOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
            onClick={() => setAddMenuOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="pb-safe w-full max-w-md rounded-t-3xl bg-card p-6"
              onClick={e => e.stopPropagation()}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="mb-6 flex items-center justify-between">
                <h3 className="font-heading text-xl">Add New</h3>
                <button
                  onClick={() => setAddMenuOpen(false)}
                  className="rounded-full p-2 transition-colors hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <AddPersonTypeCard
                  icon={Store}
                  title="Supplier"
                  subtitle="Add new vendor"
                  onClick={() => {
                    setAddMenuOpen(false);
                    setSupplierFormOpen(true);
                  }}
                />

                <AddPersonTypeCard
                  icon={Users}
                  title="Customer"
                  subtitle="Add new customer"
                  onClick={() => {
                    setAddMenuOpen(false);
                    setCustomerFormOpen(true);
                  }}
                />

                <button
                  onClick={() => {
                    setAddMenuOpen(false);
                    setTransactionFormOpen(true);
                  }}
                  className="theme-card p-4 text-left transition-colors hover:border-primary"
                >
                  <ArrowUpRight className="amount-negative mb-2 h-8 w-8" />
                  <p className="font-medium">Bill</p>
                  <p className="text-xs text-muted-foreground">Record purchase</p>
                </button>

                <button
                  onClick={() => {
                    setAddMenuOpen(false);
                    setUdharFormOpen(true);
                  }}
                  className="theme-card p-4 text-left transition-colors hover:border-primary"
                >
                  <ArrowDownLeft className="status-pending mb-2 h-8 w-8" />
                  <p className="font-medium">Udhar</p>
                  <p className="text-xs text-muted-foreground">Record credit</p>
                </button>

                <button
                  onClick={() => {
                    setAddMenuOpen(false);
                    setIncomeModalOpen(true);
                  }}
                  className="theme-card col-span-2 p-4 text-left transition-colors hover:border-primary"
                >
                  <PiggyBank className="amount-positive mb-2 h-8 w-8" />
                  <p className="font-medium">Income</p>
                  <p className="text-xs text-muted-foreground">Record daily or monthly income</p>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forms */}
      <SupplierForm
        open={supplierFormOpen}
        onOpenChange={setSupplierFormOpen}
        onSubmit={handleAddSupplier}
        title="Add Supplier"
      />

      <CustomerForm
        open={customerFormOpen}
        onOpenChange={setCustomerFormOpen}
        onSubmit={handleAddCustomer}
        title="Add Customer"
      />

      <TransactionForm
        open={transactionFormOpen}
        onOpenChange={setTransactionFormOpen}
        onSubmit={handleAddTransaction}
        suppliers={suppliers}
      />

      <UdharForm
        open={udharFormOpen}
        onOpenChange={setUdharFormOpen}
        onSubmit={handleAddUdhar}
        onAddCustomer={addCustomer}
        customers={customers}
      />

      {/* Quick Income Modal */}
      <IncomeQuickModal
        open={incomeModalOpen}
        onClose={() => setIncomeModalOpen(false)}
        onSubmit={addIncome}
        incomeList={incomeList}
        updateIncome={updateIncome}
      />
    </div>
  );
}
