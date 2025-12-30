"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, SlidersHorizontal, ArrowDownAZ, Clock, IndianRupee, X, Users, Store, ChevronDown, PiggyBank,
  ArrowUpRight, ArrowDownLeft
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
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isOpen]);
}

// Filter Chip Component
function FilterChip({ active, onClick, children, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap",
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

  // Prevent body scroll when modal is open
  usePreventBodyScroll(addMenuOpen || incomeModalOpen);

  // Data hooks
  const { suppliers, addSupplier, loading: suppliersLoading, loadAll: loadAllSuppliers, hasNextPage: hasMoreSuppliers } = useSuppliers();
  const { customers, addCustomer, loading: customersLoading, loadAll: loadAllCustomers, hasNextPage: hasMoreCustomers } = useCustomers();
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
    staleTime: 1000 * 60 * 2, // 2 minutes
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

  // Apply filters and sorting
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
        result.sort((a, b) => 
          new Date(b.lastActivity || b.createdAt || 0) - 
          new Date(a.lastActivity || a.createdAt || 0)
        );
        break;
    }
    
    return result;
  }, [allPeople, filterBy, searchQuery, sortBy]);

  // People to display (limited to 8 or show all)
  const displayPeople = showAllPeople ? filteredAndSortedPeople : filteredAndSortedPeople.slice(0, 7);

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
  const handleAddSupplier = async (data) => {
    const result = await addSupplier(data);
    if (result.success) {
      toast.success("Supplier added");
      setSupplierFormOpen(false);
    } else {
      toast.error(result.error || "Failed to add supplier");
    }
  };

  const handleAddCustomer = async (data) => {
    const result = await addCustomer(data);
    if (result.success) {
      toast.success("Customer added");
      setCustomerFormOpen(false);
    } else {
      toast.error(result.error || "Failed to add customer");
    }
  };

  const handleAddTransaction = async (data) => {
    const result = await addTransaction(data);
    if (result.success) {
      toast.success("Transaction added");
      setTransactionFormOpen(false);
    } else {
      toast.error(result.error || "Failed to add transaction");
    }
  };

  const handleAddUdhar = async (data) => {
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
    <div className="min-h-screen lg:max-w-6xl lg:mx-auto xl:max-w-7xl">
      {/* Search Bar */}
      <div className="sticky top-0 z-20 header-glass px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search name or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-hero pl-12"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "p-3 rounded-xl transition-colors flex-shrink-0",
              showFilters ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"
            )}
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        </div>

        {/* Filter & Sort Options */}
        {showFilters && (
          <div className="mt-3 space-y-3 animate-slide-up">
            {/* Type Filter */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Filter by</p>
              <div className="flex gap-2 flex-wrap">
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
              <p className="text-xs text-muted-foreground mb-2">Sort by</p>
              <div className="flex gap-2 flex-wrap">
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
              <div className="h-7 w-24 skeleton-hero rounded my-0.5" />
            ) : (
              <motion.p 
                className="text-lg font-bold font-mono amount-negative"
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
              <div className="h-7 w-24 skeleton-hero rounded my-0.5" />
            ) : (
              // Customer pending shown in amber/orange (NOT green - pending money)
              <motion.p 
                className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400"
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

      {/* People Section */}
      <section className="px-4 py-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-heading tracking-wide">People</h2>
          {(filteredAndSortedPeople.length > 7 || hasMoreSuppliers || hasMoreCustomers) && (
            <button 
              onClick={() => setShowAllPeople(!showAllPeople)}
              className="flex items-center gap-1 text-sm text-primary font-medium"
            >
              {showAllPeople ? (
                hasMoreSuppliers || hasMoreCustomers ? (
                  <>
                    Loading...
                    <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  </>
                ) : (
                  "Show less"
                )
              ) : (
                `View all (${statsData?.supplierCount + statsData?.customerCount || filteredAndSortedPeople.length})`
              )}
              <ChevronDown className={cn("h-4 w-4 transition-transform", showAllPeople && !hasMoreSuppliers && !hasMoreCustomers && "rotate-180")} />
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 justify-items-center">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-2">
                <div className="h-14 w-14 rounded-full skeleton-hero" />
                <div className="h-3 w-12 rounded skeleton-hero" />
              </div>
            ))}
          </div>
        ) : filteredAndSortedPeople.length === 0 ? (
          <div className="text-center py-8 theme-card">
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "No people found" : "No people yet"}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setSupplierFormOpen(true)}
                className="px-4 py-2 bg-muted rounded-full text-sm font-medium hover:bg-accent transition-colors"
              >
                + Add Supplier
              </button>
              <button
                onClick={() => setCustomerFormOpen(true)}
                className="px-4 py-2 bg-muted rounded-full text-sm font-medium hover:bg-accent transition-colors"
              >
                + Add Customer
              </button>
            </div>
          </div>
        ) : (
          <motion.div 
            className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 justify-items-center"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.05 }
              }
            }}
          >
            {displayPeople.map((person, index) => (
              <motion.div
                key={`${person.type}-${person.id}`}
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.9 },
                  visible: { opacity: 1, y: 0, scale: 1 }
                }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <PersonAvatarWithName
                  name={person.name}
                  image={person.image}
                  amount={person.pendingAmount > 0 ? person.pendingAmount : undefined}
                  // Pending amounts shown in amber/orange (not green - these are pending)
                  amountColor="text-amber-600 dark:text-amber-400"
                  href={`/person/${person.type}/${person.id}`}
                />
              </motion.div>
            ))}
            
            {/* Add button - only show if not in "show all" mode or there's room */}
            {!showAllPeople && (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.9 },
                  visible: { opacity: 1, y: 0, scale: 1 }
                }}
                className="flex flex-col items-center gap-1.5 p-2 cursor-pointer active:scale-95 transition-transform"
                onClick={() => setAddMenuOpen(true)}
                whileTap={{ scale: 0.9 }}
              >
                <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center hover:bg-accent transition-colors">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">Add</span>
              </motion.div>
            )}
          </motion.div>
        )}
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
            className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center"
            onClick={() => setAddMenuOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div 
              className="w-full max-w-md bg-card rounded-t-3xl p-6 pb-nav"
              onClick={e => e.stopPropagation()}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-heading tracking-wide">Add New</h3>
                <button
                  onClick={() => setAddMenuOpen(false)}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => { setAddMenuOpen(false); setSupplierFormOpen(true); }}
                className="theme-card p-4 text-left hover:border-primary transition-colors"
              >
                <Store className="h-8 w-8 text-primary mb-2" />
                <p className="font-medium">Supplier</p>
                <p className="text-xs text-muted-foreground">Add new vendor</p>
              </button>
              
              <button
                onClick={() => { setAddMenuOpen(false); setCustomerFormOpen(true); }}
                className="theme-card p-4 text-left hover:border-primary transition-colors"
              >
                <Users className="h-8 w-8 text-primary mb-2" />
                <p className="font-medium">Customer</p>
                <p className="text-xs text-muted-foreground">Add new customer</p>
              </button>
              
              <button
                onClick={() => { setAddMenuOpen(false); setTransactionFormOpen(true); }}
                className="theme-card p-4 text-left hover:border-primary transition-colors"
              >
                <ArrowUpRight className="h-8 w-8 amount-negative mb-2" />
                <p className="font-medium">Bill</p>
                <p className="text-xs text-muted-foreground">Record purchase</p>
              </button>
              
              <button
                onClick={() => { setAddMenuOpen(false); setUdharFormOpen(true); }}
                className="theme-card p-4 text-left hover:border-primary transition-colors"
              >
                <ArrowDownLeft className="h-8 w-8 status-pending mb-2" />
                <p className="font-medium">Udhar</p>
                <p className="text-xs text-muted-foreground">Record credit</p>
              </button>

              <button
                onClick={() => { setAddMenuOpen(false); setIncomeModalOpen(true); }}
                className="theme-card p-4 text-left hover:border-primary transition-colors col-span-2"
              >
                <PiggyBank className="h-8 w-8 amount-positive mb-2" />
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

// Quick Income Modal Component
function IncomeQuickModal({ open, onClose, onSubmit }) {
  const today = new Date().toISOString().split("T")[0];
  const [cashAmount, setCashAmount] = useState("");
  const [onlineAmount, setOnlineAmount] = useState("");
  const [date, setDate] = useState(today);
  const [submitting, setSubmitting] = useState(false);

  usePreventBodyScroll(open);

  const handleSubmit = async (e) => {
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
        className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl pb-nav animate-slide-up overscroll-contain"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center py-3">
          <div className="sheet-handle" />
        </div>

        <div className="px-4 pb-6">
          <h2 className="text-xl font-heading tracking-wide mb-4">Add Income</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Cash</label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  className="input-hero [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Online</label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={onlineAmount}
                  onChange={(e) => setOnlineAmount(e.target.value)}
                  className="input-hero [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={today}
                className="input-hero"
              />
            </div>

            {(Number(cashAmount) > 0 || Number(onlineAmount) > 0) && (
              <div className="p-3 bg-emerald-500/10 rounded-xl text-center">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold font-mono amount-positive">
                  ₹{((Number(cashAmount) || 0) + (Number(onlineAmount) || 0)).toLocaleString("en-IN")}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-hero disabled:opacity-50"
            >
              {submitting ? "Adding..." : "Add Income"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
