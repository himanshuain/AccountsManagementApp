"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  User,
  Receipt,
  X,
  ArrowRight,
  Users,
  Banknote,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function GlobalSearch({ className }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState({
    suppliers: [],
    transactions: [],
    customers: [],
    udhar: [],
  });
  const [isSearching, setIsSearching] = useState(false);
  const [allData, setAllData] = useState({
    suppliers: [],
    transactions: [],
    customers: [],
    udhar: [],
  });
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut to focus search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch all data when search is focused
  useEffect(() => {
    const fetchAllData = async () => {
      if (!isOpen) return;

      try {
        const [suppliersRes, customersRes, transactionsRes, udharRes] =
          await Promise.all([
            fetch("/api/suppliers"),
            fetch("/api/customers"),
            fetch("/api/transactions"),
            fetch("/api/udhar"),
          ]);

        const [suppliersData, customersData, transactionsData, udharData] =
          await Promise.all([
            suppliersRes.json(),
            customersRes.json(),
            transactionsRes.json(),
            udharRes.json(),
          ]);

        setAllData({
          suppliers: suppliersData.data || [],
          customers: customersData.data || [],
          transactions: transactionsData.data || [],
          udhar: udharData.data || [],
        });
      } catch (error) {
        console.error("Failed to fetch search data:", error);
      }
    };

    fetchAllData();
  }, [isOpen]);

  // Search when query changes
  useEffect(() => {
    const searchData = async () => {
      if (!query.trim()) {
        setResults({
          suppliers: [],
          transactions: [],
          customers: [],
          udhar: [],
        });
        return;
      }

      setIsSearching(true);
      const lowerQuery = query.toLowerCase();

      try {
        // Search suppliers
        const matchedSuppliers = allData.suppliers
          .filter(
            (s) =>
              s.name?.toLowerCase().includes(lowerQuery) ||
              s.companyName?.toLowerCase().includes(lowerQuery) ||
              s.phone?.includes(query) ||
              s.gstNumber?.toLowerCase().includes(lowerQuery),
          )
          .slice(0, 5);

        // Search customers
        const matchedCustomers = allData.customers
          .filter(
            (c) =>
              c.name?.toLowerCase().includes(lowerQuery) ||
              c.phone?.includes(query) ||
              c.address?.toLowerCase().includes(lowerQuery),
          )
          .slice(0, 5);

        // Search transactions
        const matchedTransactions = allData.transactions
          .filter((t) => {
            const supplier = allData.suppliers.find(
              (s) => s.id === t.supplierId,
            );
            const supplierName = supplier?.name?.toLowerCase() || "";
            const amount = t.amount?.toString() || "";
            const notes = t.notes?.toLowerCase() || "";

            return (
              supplierName.includes(lowerQuery) ||
              amount.includes(query) ||
              notes.includes(lowerQuery)
            );
          })
          .slice(0, 5);

        // Search udhar
        const matchedUdhar = allData.udhar
          .filter((u) => {
            const customer = allData.customers.find(
              (c) => c.id === u.customerId,
            );
            const customerName = customer?.name?.toLowerCase() || "";
            const amount =
              (
                u.amount || (u.cashAmount || 0) + (u.onlineAmount || 0)
              ).toString() || "";
            const notes = u.notes?.toLowerCase() || "";

            return (
              customerName.includes(lowerQuery) ||
              amount.includes(query) ||
              notes.includes(lowerQuery)
            );
          })
          .slice(0, 5);

        // Add supplier info to transactions
        const transactionsWithSupplier = matchedTransactions.map((t) => ({
          ...t,
          supplierName:
            allData.suppliers.find((s) => s.id === t.supplierId)?.name ||
            "Unknown",
        }));

        // Add customer info to udhar
        const udharWithCustomer = matchedUdhar.map((u) => ({
          ...u,
          customerName:
            allData.customers.find((c) => c.id === u.customerId)?.name ||
            "Unknown",
        }));

        setResults({
          suppliers: matchedSuppliers,
          transactions: transactionsWithSupplier,
          customers: matchedCustomers,
          udhar: udharWithCustomer,
        });
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchData, 200);
    return () => clearTimeout(debounce);
  }, [query, allData]);

  const handleSupplierClick = (supplier) => {
    setIsOpen(false);
    setQuery("");
    router.push(`/suppliers/${supplier.id}`);
  };

  const handleTransactionClick = (transaction) => {
    setIsOpen(false);
    setQuery("");
    router.push(`/suppliers/${transaction.supplierId}`);
  };

  const handleCustomerClick = (customer) => {
    setIsOpen(false);
    setQuery("");
    router.push(`/transactions?tab=customers&customer=${customer.id}`);
  };

  const handleUdharClick = (udhar) => {
    setIsOpen(false);
    setQuery("");
    router.push(`/transactions?tab=customers&customer=${udhar.customerId}`);
  };

  const getInitials = (name) => {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "??"
    );
  };

  const hasResults =
    results.suppliers.length > 0 ||
    results.transactions.length > 0 ||
    results.customers.length > 0 ||
    results.udhar.length > 0;

  const paymentStatusColors = {
    paid: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
    partial: "bg-blue-100 text-blue-700",
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-9 pr-9 h-10 bg-muted/50 border-muted focus:bg-background"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && query && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border rounded-lg shadow-lg overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
          {isSearching ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-r-transparent" />
              <p className="mt-2 text-sm">Searching...</p>
            </div>
          ) : !hasResults ? (
            <div className="p-4 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                No results found for &quot;{query}&quot;
              </p>
            </div>
          ) : (
            <>
              {/* Customers Section */}
              {results.customers.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-amber-500/10 border-b">
                    <div className="flex items-center gap-2 text-xs font-medium text-amber-700">
                      <Users className="h-3 w-3" />
                      CUSTOMERS
                    </div>
                  </div>
                  {results.customers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => handleCustomerClick(customer)}
                      className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={customer.profilePicture} />
                        <AvatarFallback className="text-xs bg-amber-100 text-amber-700">
                          {getInitials(customer.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {customer.name}
                        </p>
                        {customer.phone && (
                          <p className="text-xs text-muted-foreground truncate">
                            {customer.phone}
                          </p>
                        )}
                      </div>
                      {customer.totalPending > 0 && (
                        <Badge className="bg-amber-100 text-amber-700 text-[10px]">
                          ₹{customer.totalPending?.toLocaleString()}
                        </Badge>
                      )}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              {/* Udhar Section */}
              {results.udhar.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-amber-500/10 border-b border-t">
                    <div className="flex items-center gap-2 text-xs font-medium text-amber-700">
                      <Banknote className="h-3 w-3" />
                      UDHAR
                    </div>
                  </div>
                  {results.udhar.map((udhar) => (
                    <button
                      key={udhar.id}
                      onClick={() => handleUdharClick(udhar)}
                      className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center">
                        <Banknote className="h-4 w-4 text-amber-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          ₹
                          {(
                            udhar.amount ||
                            (udhar.cashAmount || 0) + (udhar.onlineAmount || 0)
                          ).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {udhar.customerName} •{" "}
                          {new Date(udhar.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                      <Badge
                        className={cn(
                          "text-[10px]",
                          paymentStatusColors[udhar.paymentStatus],
                        )}
                      >
                        {udhar.paymentStatus}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}

              {/* Suppliers Section */}
              {results.suppliers.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-muted/50 border-b border-t">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <User className="h-3 w-3" />
                      SUPPLIERS
                    </div>
                  </div>
                  {results.suppliers.map((supplier) => (
                    <button
                      key={supplier.id}
                      onClick={() => handleSupplierClick(supplier)}
                      className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={supplier.profilePicture} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(supplier.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {supplier.name}
                        </p>
                        {supplier.companyName && (
                          <p className="text-xs text-muted-foreground truncate">
                            {supplier.companyName}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              {/* Transactions Section */}
              {results.transactions.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-muted/50 border-b border-t">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Receipt className="h-3 w-3" />
                      TRANSACTIONS
                    </div>
                  </div>
                  {results.transactions.map((transaction) => (
                    <button
                      key={transaction.id}
                      onClick={() => handleTransactionClick(transaction)}
                      className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          ₹{transaction.amount?.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {transaction.supplierName} •{" "}
                          {new Date(transaction.date).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                            },
                          )}
                        </p>
                      </div>
                      <Badge
                        className={cn(
                          "text-[10px]",
                          paymentStatusColors[transaction.paymentStatus],
                        )}
                      >
                        {transaction.paymentStatus}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default GlobalSearch;
