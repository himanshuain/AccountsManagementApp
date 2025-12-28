/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  ChevronLeft,
  MoreVertical,
  Users,
  Store,
  Receipt,
  Banknote,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useSuppliers from "@/hooks/useSuppliers";
import useTransactions from "@/hooks/useTransactions";
import useCustomers from "@/hooks/useCustomers";
import useUdhar from "@/hooks/useUdhar";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { InfiniteScrollTrigger } from "@/components/InfiniteScrollTrigger";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { haptics } from "@/hooks/useHaptics";
import { resolveImageUrl } from "@/lib/image-url";

// GPay Components
import {
  SegmentedControl,
  FilterChips,
  TransactionRow,
  TransactionRowSkeleton,
  MonthHeader,
  PersonAvatar,
} from "@/components/gpay";

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isOnline = useOnlineStatus();
  
  const { suppliers } = useSuppliers();
  const {
    transactions,
    loading: transactionsLoading,
    totalCount: transactionsTotalCount,
    fetchNextPage: fetchNextTransactions,
    hasNextPage: hasMoreTransactions,
    isFetchingNextPage: isFetchingMoreTransactions,
  } = useTransactions();
  
  const { customers } = useCustomers();
  const {
    udharList,
    loading: udharLoading,
    totalCount: udharTotalCount,
    fetchNextPage: fetchNextUdhar,
    hasNextPage: hasMoreUdhar,
    isFetchingNextPage: isFetchingMoreUdhar,
  } = useUdhar();

  // Tab state
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("transactionsTab") || "suppliers";
    }
    return "suppliers";
  });

  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Persist tab selection
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    haptics.light();
    if (typeof window !== "undefined") {
      localStorage.setItem("transactionsTab", tab);
    }
  };

  // Read tab from URL query params
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "customers" || tab === "suppliers") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Filter definitions
  const filterOptions = [
    {
      id: "status",
      label: "Status",
      value: statusFilter,
      options: [
        { value: "all", label: "All" },
        { value: "pending", label: "Pending" },
        { value: "partial", label: "Partial" },
        { value: "paid", label: "Paid" },
      ],
    },
    {
      id: "date",
      label: "Date",
      value: dateFilter,
      options: [
        { value: "all", label: "All Time" },
        { value: "7", label: "Last 7 Days" },
        { value: "30", label: "Last 30 Days" },
        { value: "90", label: "Last 3 Months" },
      ],
    },
  ];

  const handleFilterChange = (filterId, value) => {
    if (filterId === "status") setStatusFilter(value);
    if (filterId === "date") setDateFilter(value);
  };

  // Process supplier transactions
  const processedTransactions = useMemo(() => {
    let filtered = [...transactions];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => {
        const supplier = suppliers.find(s => s.id === t.supplierId);
        return (
          supplier?.name?.toLowerCase().includes(query) ||
          supplier?.companyName?.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.itemName?.toLowerCase().includes(query)
        );
      });
    }
    
    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(t => t.paymentStatus === statusFilter);
    }
    
    // Date filter
    if (dateFilter !== "all") {
      const days = parseInt(dateFilter);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      filtered = filtered.filter(t => new Date(t.date) >= startDate);
    }
    
    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Group by month
    const grouped = {};
    filtered.forEach(t => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          month: monthKey,
          year: date.getFullYear(),
          monthName: date.toLocaleDateString('en-IN', { month: 'long' }),
          transactions: [],
          total: 0,
        };
      }
      grouped[monthKey].transactions.push(t);
      grouped[monthKey].total += Number(t.amount) || 0;
    });
    
    return Object.values(grouped).sort((a, b) => b.month.localeCompare(a.month));
  }, [transactions, suppliers, searchQuery, statusFilter, dateFilter]);

  // Process customer udhar
  const processedUdhar = useMemo(() => {
    let filtered = [...udharList];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u => {
        const customer = customers.find(c => c.id === u.customerId);
        return (
          customer?.name?.toLowerCase().includes(query) ||
          u.description?.toLowerCase().includes(query) ||
          u.notes?.toLowerCase().includes(query)
        );
      });
    }
    
    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(u => u.paymentStatus === statusFilter);
    }
    
    // Date filter
    if (dateFilter !== "all") {
      const days = parseInt(dateFilter);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      filtered = filtered.filter(u => new Date(u.date) >= startDate);
    }
    
    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Group by month
    const grouped = {};
    filtered.forEach(u => {
      const date = new Date(u.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const amount = u.amount || (u.cashAmount || 0) + (u.onlineAmount || 0);
      const paidAmount = u.paidAmount || (u.paidCash || 0) + (u.paidOnline || 0);
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          month: monthKey,
          year: date.getFullYear(),
          monthName: date.toLocaleDateString('en-IN', { month: 'long' }),
          transactions: [],
          total: 0,
          collected: 0,
        };
      }
      grouped[monthKey].transactions.push(u);
      grouped[monthKey].total += amount;
      grouped[monthKey].collected += paidAmount;
    });
    
    return Object.values(grouped).sort((a, b) => b.month.localeCompare(a.month));
  }, [udharList, customers, searchQuery, statusFilter, dateFilter]);

  // Handle transaction click
  const handleTransactionClick = (item) => {
    haptics.light();
    if (activeTab === "suppliers") {
      router.push(`/chat/supplier/${item.supplierId}`);
    } else {
      router.push(`/chat/customer/${item.customerId}`);
    }
  };

  const loading = activeTab === "suppliers" ? transactionsLoading : udharLoading;
  const data = activeTab === "suppliers" ? processedTransactions : processedUdhar;

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center gap-2 px-2 py-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-10 w-10 rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-muted border-0 rounded-xl"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toast.info("Export coming soon")}>
                Export to PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filter Chips */}
        <FilterChips
          filters={filterOptions}
          onFilterChange={handleFilterChange}
          className="px-4 pb-2"
        />
      </div>

      {/* Tab Switcher */}
      <div className="px-4 py-3">
        <SegmentedControl
          options={[
            { value: "suppliers", label: "Vyapari Bills", count: transactions.length },
            { value: "customers", label: "Customer Udhar", count: udharList.length },
          ]}
          value={activeTab}
          onChange={handleTabChange}
          className="w-full"
        />
      </div>

      {/* Content */}
      <div className="px-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <TransactionRowSkeleton key={i} />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            {activeTab === "suppliers" ? (
              <Receipt className="h-12 w-12 text-muted-foreground/50 mb-4" />
            ) : (
              <Banknote className="h-12 w-12 text-muted-foreground/50 mb-4" />
            )}
            <p className="text-muted-foreground">No transactions found</p>
            {(searchQuery || statusFilter !== "all" || dateFilter !== "all") && (
              <Button
                variant="link"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setDateFilter("all");
                }}
                className="mt-2"
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {data.map((group) => (
              <div key={group.month} className="space-y-1">
                {/* Month Header */}
                <MonthHeader
                  month={group.month}
                  year={group.year}
                  totalAmount={activeTab === "customers" ? group.collected : group.total}
                  isPositive={activeTab === "customers"}
                />
                
                {/* Transactions */}
                <div className="bg-card rounded-xl border overflow-hidden">
                  {group.transactions.map((item, index) => {
                    const person = activeTab === "suppliers"
                      ? suppliers.find(s => s.id === item.supplierId)
                      : customers.find(c => c.id === item.customerId);
                    
                    const amount = activeTab === "suppliers"
                      ? item.amount
                      : item.amount || (item.cashAmount || 0) + (item.onlineAmount || 0);
                    
                    const isPaid = item.paymentStatus === "paid";
                    const isPartial = item.paymentStatus === "partial";
                    
                    return (
                      <TransactionRow
                        key={item.id || index}
                        name={person?.companyName || person?.name || "Unknown"}
                        image={person?.profilePicture}
                        date={item.date}
                        amount={amount}
                        type={activeTab === "customers" ? "income" : "expense"}
                        status={isPaid ? "success" : isPartial ? "pending" : "pending"}
                        description={item.description || item.itemName}
                        onClick={() => handleTransactionClick(item)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Infinite Scroll */}
        {activeTab === "suppliers" ? (
          <InfiniteScrollTrigger
            onLoadMore={fetchNextTransactions}
            hasMore={hasMoreTransactions}
            isLoading={isFetchingMoreTransactions}
            loadedCount={transactions.length}
            totalCount={transactionsTotalCount}
          />
        ) : (
          <InfiniteScrollTrigger
            onLoadMore={fetchNextUdhar}
            hasMore={hasMoreUdhar}
            isLoading={isFetchingMoreUdhar}
            loadedCount={udharList.length}
            totalCount={udharTotalCount}
          />
        )}
      </div>
    </div>
  );
}
