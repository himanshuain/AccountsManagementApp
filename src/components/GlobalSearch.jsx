"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, User, Receipt, X, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { supplierDB, transactionDB } from "@/lib/db";

export function GlobalSearch({ suppliers = [], className }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState({ suppliers: [], transactions: [] });
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = e => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut to focus search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = e => {
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

  // Search when query changes
  useEffect(() => {
    const searchData = async () => {
      if (!query.trim()) {
        setResults({ suppliers: [], transactions: [] });
        return;
      }

      setIsSearching(true);
      const lowerQuery = query.toLowerCase();

      try {
        // Search suppliers
        const allSuppliers = await supplierDB.getAll();
        const matchedSuppliers = allSuppliers
          .filter(
            s =>
              s.name?.toLowerCase().includes(lowerQuery) ||
              s.companyName?.toLowerCase().includes(lowerQuery) ||
              s.phone?.includes(query) ||
              s.gstNumber?.toLowerCase().includes(lowerQuery)
          )
          .slice(0, 5);

        // Search transactions
        const allTransactions = await transactionDB.getAll();
        const matchedTransactions = allTransactions
          .filter(t => {
            const supplier = allSuppliers.find(s => s.id === t.supplierId);
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

        // Add supplier info to transactions
        const transactionsWithSupplier = matchedTransactions.map(t => ({
          ...t,
          supplierName: allSuppliers.find(s => s.id === t.supplierId)?.name || "Unknown",
        }));

        setResults({
          suppliers: matchedSuppliers,
          transactions: transactionsWithSupplier,
        });
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchData, 200);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSupplierClick = supplier => {
    setIsOpen(false);
    setQuery("");
    router.push(`/suppliers/${supplier.id}`);
  };

  const handleTransactionClick = transaction => {
    setIsOpen(false);
    setQuery("");
    router.push(`/suppliers/${transaction.supplierId}`);
  };

  const getInitials = name => {
    return (
      name
        ?.split(" ")
        .map(n => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "??"
    );
  };

  const hasResults = results.suppliers.length > 0 || results.transactions.length > 0;

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
          placeholder="Search suppliers, transactions... (⌘K)"
          value={query}
          onChange={e => setQuery(e.target.value)}
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
              <p className="text-sm">No results found for &quot;{query}&quot;</p>
            </div>
          ) : (
            <>
              {/* Suppliers Section */}
              {results.suppliers.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-muted/50 border-b">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <User className="h-3 w-3" />
                      SUPPLIERS
                    </div>
                  </div>
                  {results.suppliers.map(supplier => (
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
                        <p className="font-medium text-sm truncate">{supplier.name}</p>
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
                  {results.transactions.map(transaction => (
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
                          {new Date(transaction.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                      <Badge
                        className={cn(
                          "text-[10px]",
                          paymentStatusColors[transaction.paymentStatus]
                        )}
                      >
                        {transaction.paymentStatus}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}

              {/* View all link */}
              {hasResults && (
                <div className="px-3 py-2 border-t bg-muted/30">
                  <p className="text-xs text-muted-foreground text-center">
                    Press <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded">Enter</kbd> to
                    search or <kbd className="px-1.5 py-0.5 text-[10px] bg-muted rounded">Esc</kbd>{" "}
                    to close
                  </p>
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
