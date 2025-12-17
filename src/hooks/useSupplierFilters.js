"use client";

import { useMemo } from "react";

/**
 * Hook for filtering and sorting suppliers
 */
export function useSupplierFilters(suppliersWithStats, searchQuery, activeFilter, sortOrder) {
  const filteredSuppliers = useMemo(() => {
    let filtered = [...suppliersWithStats];
    
    // Search filter - context-aware (name, phone, or amount)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const numericQuery = parseFloat(query.replace(/[^\d.]/g, ""));
      filtered = filtered.filter(
        s =>
          s.name?.toLowerCase().includes(query) ||
          s.companyName?.toLowerCase().includes(query) ||
          s.phone?.includes(query) ||
          // Also search by pending amount
          (!isNaN(numericQuery) && s.pendingAmount >= numericQuery * 0.9 && s.pendingAmount <= numericQuery * 1.1)
      );
    }

    // Apply filter chips
    if (activeFilter === "pending") {
      filtered = filtered.filter(s => s.pendingAmount > 0 && s.paidAmount === 0);
    } else if (activeFilter === "partial") {
      filtered = filtered.filter(s => s.pendingAmount > 0 && s.paidAmount > 0);
    } else if (activeFilter === "paid") {
      filtered = filtered.filter(s => s.pendingAmount === 0 && s.totalAmount > 0);
    } else if (activeFilter === "high") {
      filtered = filtered.filter(s => s.pendingAmount >= 10000);
    }

    // Smart sorting based on active filter
    const effectiveSort = sortOrder === "smart" 
      ? (activeFilter === "pending" || activeFilter === "high" ? "highest" 
         : activeFilter === "partial" ? "oldest" 
         : activeFilter === "paid" ? "newest" 
         : "highest") // default: show highest pending first
      : sortOrder;

    if (effectiveSort === "highest") {
      return filtered.sort((a, b) => b.pendingAmount - a.pendingAmount);
    } else if (effectiveSort === "lowest") {
      return filtered.sort((a, b) => a.pendingAmount - b.pendingAmount);
    } else if (effectiveSort === "oldest") {
      return filtered.sort((a, b) => {
        const dateA = a.lastTransactionDate instanceof Date ? a.lastTransactionDate : new Date(a.lastTransactionDate || 0);
        const dateB = b.lastTransactionDate instanceof Date ? b.lastTransactionDate : new Date(b.lastTransactionDate || 0);
        return dateA - dateB;
      });
    } else if (effectiveSort === "newest") {
      return filtered.sort((a, b) => {
        const dateA = a.lastTransactionDate instanceof Date ? a.lastTransactionDate : new Date(a.lastTransactionDate || 0);
        const dateB = b.lastTransactionDate instanceof Date ? b.lastTransactionDate : new Date(b.lastTransactionDate || 0);
        return dateB - dateA;
      });
    }

    return filtered.sort((a, b) => b.pendingAmount - a.pendingAmount);
  }, [suppliersWithStats, searchQuery, activeFilter, sortOrder]);

  return filteredSuppliers;
}

