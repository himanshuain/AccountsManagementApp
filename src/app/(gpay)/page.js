"use client";

import { useState, useMemo, useEffect } from "react";
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
  ChevronRight,
  History,
} from "lucide-react";
import { toast } from "sonner";

import { useSuppliers } from "@/hooks/useSuppliers";
import { useCustomers } from "@/hooks/useCustomers";
import { useTransactions } from "@/hooks/useTransactions";
import { useUdhar } from "@/hooks/useUdhar";
import { useIncome } from "@/hooks/useIncome";

import { PersonAvatarWithName } from "@/components/gpay/PersonAvatar";
import { SupplierForm } from "@/components/SupplierForm";
import { CustomerForm } from "@/components/CustomerForm";
import { TransactionForm } from "@/components/TransactionForm";
import { UdharForm } from "@/components/UdharForm";
import { cn } from "@/lib/utils";

// Hook to prevent body scroll when modal is open
function usePreventBodyScroll(isOpen) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [isOpen]);
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

export default function GPayHomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllPeople, setShowAllPeople] = useState(false);
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
  const [recentExpanded, setRecentExpanded] = useState(true);

  // Prevent body scroll when modal is open
  usePreventBodyScroll(addMenuOpen || incomeModalOpen);

  // Data hooks
  const {
    suppliers,
    addSupplier,
    loading: suppliersLoading,
    loadAll: loadAllSuppliers,
    hasNextPage: hasMoreSuppliers,
  } = useSuppliers();
  const {
    customers,
    addCustomer,
    loading: customersLoading,
    loadAll: loadAllCustomers,
    hasNextPage: hasMoreCustomers,
  } = useCustomers();
  const { transactions, addTransaction, loading: transactionsLoading } = useTransactions();
  const { udharList, addUdhar, loading: udharLoading } = useUdhar();
  const { addIncome } = useIncome();

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
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

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
        .reduce((sum, u) => sum + (Number(u.amount) || 0), 0);

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

  // Separate suppliers and customers lists
  const suppliersList = useMemo(() => {
    let result = allPeople.filter(p => p.type === "supplier");

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        p => p.name?.toLowerCase().includes(query) || p.phone?.includes(query)
      );
    }

    // Apply sorting
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
  }, [allPeople, searchQuery, sortBy]);

  const customersList = useMemo(() => {
    let result = allPeople.filter(p => p.type === "customer");

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        p => p.name?.toLowerCase().includes(query) || p.phone?.includes(query)
      );
    }

    // Apply sorting
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
  }, [allPeople, searchQuery, sortBy]);

  // Recently accessed people (based on last activity, limited to 6)
  const recentPeople = useMemo(() => {
    return [...allPeople]
      .filter(p => p.lastActivity)
      .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity))
      .slice(0, 6);
  }, [allPeople]);

  // Apply filters and sorting (kept for backward compatibility)
  const filteredAndSortedPeople = useMemo(() => {
    let result = [...allPeople];

    // Apply type filter
    if (filterBy !== "all") {
      result = result.filter(p => p.type === filterBy);
    }

    // Apply search filter (name, phone, and amount)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const numQuery = parseFloat(query.replace(/[₹,\s]/g, ""));

      result = result.filter(p => {
        // Match by name or phone
        if (p.name?.toLowerCase().includes(query) || p.phone?.includes(query)) {
          return true;
        }
        // Match by amount if search is a number
        if (!isNaN(numQuery) && p.pendingAmount > 0) {
          const amountStr = String(p.pendingAmount);
          return amountStr.includes(query.replace(/[₹,\s]/g, ""));
        }
        return false;
      });
    }

    // Apply sorting
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
  }, [allPeople, filterBy, searchQuery, sortBy]);

  // Check if any filter is active
  const hasActiveFilters = filterBy !== "all" || sortBy !== "amount";

  // Load all data when "View all" is clicked
  useEffect(() => {
    if (showAllPeople) {
      if (hasMoreSuppliers) loadAllSuppliers();
      if (hasMoreCustomers) loadAllCustomers();
    }
  }, [showAllPeople, hasMoreSuppliers, hasMoreCustomers, loadAllSuppliers, loadAllCustomers]);

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

  // Handlers
  const handleAddSupplier = async data => {
    const result = await addSupplier(data);
    if (result.success) {
      toast.success("Supplier added");
      setSupplierFormOpen(false);
    } else {
      toast.error(result.error || "Failed to add supplier");
    }
  };

  const handleAddCustomer = async data => {
    const result = await addCustomer(data);
    if (result.success) {
      toast.success("Customer added");
      setCustomerFormOpen(false);
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
    <div className="min-h-screen lg:mx-auto lg:max-w-6xl xl:max-w-7xl">
      {/* Search Bar */}
      <div className="header-glass sticky top-0 z-20 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search name or amount..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-hero pl-12"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "relative flex-shrink-0 rounded-xl p-3 transition-colors",
              showFilters ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"
            )}
          >
            <SlidersHorizontal className="h-5 w-5" />
            {/* Badge when filters active */}
            {hasActiveFilters && !showFilters && (
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-primary ring-2 ring-background" />
            )}
          </button>
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
      </div>

      {/* Stats Summary - Pending amounts only */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            className="theme-card p-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0 }}
          >
            <p className="text-xs text-muted-foreground">You Owe (Suppliers)</p>
            {isStatsLoading ? (
              <div className="skeleton-hero my-0.5 h-7 w-24 rounded" />
            ) : (
              <motion.p
                className="amount-negative font-mono text-lg font-bold"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                ₹{stats.totalSupplierPending.toLocaleString("en-IN")}
              </motion.p>
            )}
            <p className="text-xs text-muted-foreground">{stats.supplierCount} suppliers</p>
          </motion.div>
          <motion.div
            className="theme-card p-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <p className="text-xs text-muted-foreground">Pending with Customers</p>
            {isStatsLoading ? (
              <div className="skeleton-hero my-0.5 h-7 w-24 rounded" />
            ) : (
              // Customer pending shown in amber/orange (NOT green - pending money)
              <motion.p
                className="font-mono text-lg font-bold text-amber-600 dark:text-amber-400"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                ₹{stats.totalCustomerPending.toLocaleString("en-IN")}
              </motion.p>
            )}
            <p className="text-xs text-muted-foreground">{stats.customerCount} customers</p>
          </motion.div>
        </div>
      </div>

      {/* Recently Accessed Section */}
      {recentPeople.length > 0 && (
        <section className="px-4 py-2">
          <button
            onClick={() => setRecentExpanded(!recentExpanded)}
            className="mb-3 flex w-full items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-heading text-lg tracking-wide">Recent</h2>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform",
                recentExpanded && "rotate-180"
              )}
            />
          </button>

          <AnimatePresence>
            {recentExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-2">
                  {recentPeople.map(person => (
                    <div key={`recent-${person.type}-${person.id}`} className="flex-shrink-0">
                      <PersonAvatarWithName
                        name={person.name}
                        image={person.image}
                        amount={person.pendingAmount > 0 ? person.pendingAmount : undefined}
                        amountColor={
                          person.type === "supplier"
                            ? "amount-negative"
                            : "text-amber-600 dark:text-amber-400"
                        }
                        href={`/person/${person.type}/${person.id}`}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* Suppliers Section */}
      <section className="mt-6 px-4 py-6">
        <button
          onClick={() => setSuppliersExpanded(!suppliersExpanded)}
          className="mb-3 flex w-full items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <h2 className="font-heading text-lg tracking-wide text-green-500">Suppliers</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {statsData?.supplierCount || suppliersList.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ChevronDown
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform",
                suppliersExpanded && "rotate-180"
              )}
            />
          </div>
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
                <div className="grid grid-cols-4 justify-items-center gap-3 sm:grid-cols-5 md:grid-cols-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 p-2">
                      <div className="skeleton-hero h-12 w-12 rounded-full" />
                      <div className="skeleton-hero h-3 w-10 rounded" />
                    </div>
                  ))}
                </div>
              ) : suppliersList.length === 0 ? (
                <div className="theme-card py-6 mt-1 text-center">
                  <Store className="mx-auto mb-2 h-10 w-10 text-muted-foreground/50" />
                  <p className="mb-3 text-sm text-muted-foreground">No suppliers yet</p>
                  <button
                    onClick={() => setSupplierFormOpen(true)}
                    className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  >
                    + Add Supplier
                  </button>
                </div>
              ) : (
                <motion.div
                  className="grid grid-cols-4 justify-items-center gap-3 sm:grid-cols-5 md:grid-cols-6"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { staggerChildren: 0.03 } },
                  }}
                >
                  {suppliersList.slice(0, showAllPeople ? undefined : 8).map(person => (
                    <motion.div
                      key={`supplier-${person.id}`}
                      variants={{
                        hidden: { opacity: 0, scale: 0.9 },
                        visible: { opacity: 1, scale: 1 },
                      }}
                    >
                      <PersonAvatarWithName
                        name={person.name}
                        image={person.image}
                        amount={person.pendingAmount > 0 ? person.pendingAmount : undefined}
                        amountColor="amount-negative"
                        href={`/person/supplier/${person.id}`}
                        size="sm"
                      />
                    </motion.div>
                  ))}
                  {!showAllPeople && suppliersList.length > 8 && (
                    <button
                      onClick={() => setShowAllPeople(true)}
                      className="flex flex-col items-center gap-1 p-2"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        +{suppliersList.length - 8}
                      </span>
                    </button>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Customers Section */}
      <section className="mt-3 px-4 py-2">
        <button
          onClick={() => setCustomersExpanded(!customersExpanded)}
          className="mb-3 flex w-full items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-500" />
            <h2 className="font-heading text-lg tracking-wide text-orange-500">Customers</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {statsData?.customerCount || customersList.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ChevronDown
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform",
                customersExpanded && "rotate-180"
              )}
            />
          </div>
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
                <div className="grid grid-cols-4 justify-items-center gap-3 sm:grid-cols-5 md:grid-cols-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 p-2">
                      <div className="skeleton-hero h-12 w-12 rounded-full" />
                      <div className="skeleton-hero h-3 w-10 rounded" />
                    </div>
                  ))}
                </div>
              ) : customersList.length === 0 ? (
                <div className="theme-card py-6 mt-1 text-center">
                  <Users className="mx-auto mb-2 h-10 w-10 text-muted-foreground/50" />
                  <p className="mb-3 text-sm text-muted-foreground">No customers yet</p>
                  <button
                    onClick={() => setCustomerFormOpen(true)}
                    className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-white"
                  >
                    + Add Customer
                  </button>
                </div>
              ) : (
                <motion.div
                  className="grid grid-cols-4 justify-items-center gap-3 sm:grid-cols-5 md:grid-cols-6"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { staggerChildren: 0.03 } },
                  }}
                >
                  {customersList.slice(0, showAllPeople ? undefined : 8).map(person => (
                    <motion.div
                      key={`customer-${person.id}`}
                      variants={{
                        hidden: { opacity: 0, scale: 0.9 },
                        visible: { opacity: 1, scale: 1 },
                      }}
                    >
                      <PersonAvatarWithName
                        name={person.name}
                        image={person.image}
                        amount={person.pendingAmount > 0 ? person.pendingAmount : undefined}
                        amountColor="text-amber-600 dark:text-amber-400"
                        href={`/person/customer/${person.id}`}
                        size="sm"
                      />
                    </motion.div>
                  ))}
                  {!showAllPeople && customersList.length > 8 && (
                    <button
                      onClick={() => setShowAllPeople(true)}
                      className="flex flex-col items-center gap-1 p-2"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        +{customersList.length - 8}
                      </span>
                    </button>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

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
              className="pb-nav w-full max-w-md rounded-t-3xl bg-card p-6"
              onClick={e => e.stopPropagation()}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="mb-6 flex items-center justify-between">
                <h3 className="font-heading text-xl tracking-wide">Add New</h3>
                <button
                  onClick={() => setAddMenuOpen(false)}
                  className="rounded-full p-2 transition-colors hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setAddMenuOpen(false);
                    setSupplierFormOpen(true);
                  }}
                  className="theme-card p-4 text-left transition-colors hover:border-primary"
                >
                  <Store className="mb-2 h-8 w-8 text-primary" />
                  <p className="font-medium">Supplier</p>
                  <p className="text-xs text-muted-foreground">Add new vendor</p>
                </button>

                <button
                  onClick={() => {
                    setAddMenuOpen(false);
                    setCustomerFormOpen(true);
                  }}
                  className="theme-card p-4 text-left transition-colors hover:border-primary"
                >
                  <Users className="mb-2 h-8 w-8 text-primary" />
                  <p className="font-medium">Customer</p>
                  <p className="text-xs text-muted-foreground">Add new customer</p>
                </button>

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
      />
    </div>
  );
}

// Get today's date in local timezone (YYYY-MM-DD format)
function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Quick Income Modal Component
function IncomeQuickModal({ open, onClose, onSubmit }) {
  const today = getLocalDate();
  const [cashAmount, setCashAmount] = useState("");
  const [onlineAmount, setOnlineAmount] = useState("");
  const [date, setDate] = useState(today);
  const [submitting, setSubmitting] = useState(false);

  usePreventBodyScroll(open);

  const handleSubmit = async e => {
    e.preventDefault();
    const cash = Number(cashAmount) || 0;
    const online = Number(onlineAmount) || 0;
    const total = cash + online;

    if (total <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setSubmitting(true);
    const result = await onSubmit({
      amount: total,
      cashAmount: cash,
      onlineAmount: online,
      date: date,
      type: "daily",
    });

    if (result.success) {
      toast.success("Income added");
      setCashAmount("");
      setOnlineAmount("");
      setDate(today);
      onClose();
    } else {
      toast.error(result.error || "Failed to add");
    }
    setSubmitting(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose}>
      <div
        className="pb-nav animate-slide-up absolute bottom-0 left-0 right-0 overscroll-contain rounded-t-3xl bg-card"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center py-3">
          <div className="sheet-handle" />
        </div>

        <div className="px-4 pb-6">
          <h2 className="mb-4 font-heading text-xl tracking-wide">Add Income</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Cash</label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={cashAmount}
                  onChange={e => setCashAmount(e.target.value)}
                  className="input-hero [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Online</label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={onlineAmount}
                  onChange={e => setOnlineAmount(e.target.value)}
                  className="input-hero [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => {
                  const selectedDate = e.target.value;
                  // Prevent future dates (iOS Safari ignores max attribute)
                  if (selectedDate > today) {
                    setDate(today);
                  } else {
                    setDate(selectedDate);
                  }
                }}
                max={today}
                className="input-hero"
              />
            </div>

            {(Number(cashAmount) > 0 || Number(onlineAmount) > 0) && (
              <div className="rounded-xl bg-emerald-500/10 p-3 text-center">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="amount-positive font-mono text-2xl font-bold">
                  ₹
                  {((Number(cashAmount) || 0) + (Number(onlineAmount) || 0)).toLocaleString(
                    "en-IN"
                  )}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-hero w-full disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add Income"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
