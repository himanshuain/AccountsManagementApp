"use client";

import { useCallback, useMemo } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PAGE_SIZE, CACHE_SETTINGS } from "@/lib/constants";

const TRANSACTIONS_KEY = ["transactions"];
const STATS_KEY = ["stats"];

export function useTransactions(supplierId = null) {
  const queryClient = useQueryClient();

  const queryKey = supplierId ? [...TRANSACTIONS_KEY, { supplierId }] : TRANSACTIONS_KEY;

  // Fetch transactions with pagination using infinite query
  const {
    data,
    isLoading: loading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam = 1 }) => {
      let url = `/api/transactions?page=${pageParam}&limit=${PAGE_SIZE.TRANSACTIONS}`;
      if (supplierId) {
        url += `&supplierId=${supplierId}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }
      const result = await response.json();
      return {
        data: result.data || [],
        pagination: result.pagination || { hasMore: false, page: pageParam },
      };
    },
    getNextPageParam: lastPage => {
      if (lastPage.pagination?.hasMore) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: CACHE_SETTINGS.STALE_TIME,
    retry: CACHE_SETTINGS.RETRY_COUNT,
  });

  // Flatten all pages into a single array for backward compatibility
  const transactions = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.data);
  }, [data]);

  // Get total count from the first page's pagination
  const totalCount = useMemo(() => {
    return data?.pages?.[0]?.pagination?.total ?? transactions.length;
  }, [data, transactions.length]);

  // Add transaction mutation - directly to cloud
  const addMutation = useMutation({
    mutationFn: async transactionData => {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transactionData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add transaction");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
    },
  });

  // Update transaction mutation - directly to cloud
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update transaction");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
    },
  });

  // Delete transaction mutation - directly to cloud
  const deleteMutation = useMutation({
    mutationFn: async id => {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete transaction");
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
    },
  });

  const addTransaction = useCallback(
    async transactionData => {
      try {
        const result = await addMutation.mutateAsync(transactionData);
        return { success: true, data: result?.data };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    [addMutation]
  );

  const updateTransaction = useCallback(
    async (id, updates) => {
      try {
        await updateMutation.mutateAsync({ id, updates });
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    [updateMutation]
  );

  const deleteTransaction = useCallback(
    async id => {
      try {
        await deleteMutation.mutateAsync(id);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    [deleteMutation]
  );

  // Record a partial payment for a transaction
  const recordPayment = useCallback(
    async (id, amount, receiptUrls = null, paymentDate = null) => {
      const transaction = transactions.find(t => t.id === id);
      if (!transaction) return { success: false, error: "Transaction not found" };

      const totalAmount = transaction.amount || 0;
      const currentPaid = transaction.paidAmount || 0;
      const newPaidAmount = currentPaid + amount;

      // Support both single URL (string) and array of URLs
      const receipts = receiptUrls 
        ? (Array.isArray(receiptUrls) ? receiptUrls : [receiptUrls])
        : [];

      const newPayment = {
        id: crypto.randomUUID(),
        amount: amount,
        date: paymentDate || new Date().toISOString(),
        receiptUrl: receipts[0] || null, // Keep for backward compatibility
        receiptUrls: receipts, // New field for multiple receipts
      };

      const updates = {
        payments: [...(transaction.payments || []), newPayment],
        paidAmount: newPaidAmount,
        paymentStatus: newPaidAmount >= totalAmount ? "paid" : "partial",
      };

      return await updateTransaction(id, updates);
    },
    [transactions, updateTransaction]
  );

  // Mark transaction as fully paid
  const markFullPaid = useCallback(
    async (id, receiptUrls = null, paymentDate = null) => {
      const transaction = transactions.find(t => t.id === id);
      if (!transaction) return { success: false, error: "Transaction not found" };

      const totalAmount = transaction.amount || 0;
      const currentPaid = transaction.paidAmount || 0;
      const remainingAmount = totalAmount - currentPaid;

      // Support both single URL (string) and array of URLs
      const receipts = receiptUrls 
        ? (Array.isArray(receiptUrls) ? receiptUrls : [receiptUrls])
        : [];

      const payments = [...(transaction.payments || [])];
      const dateToUse = paymentDate || new Date().toISOString();
      if (remainingAmount > 0) {
        payments.push({
          id: crypto.randomUUID(),
          amount: remainingAmount,
          date: dateToUse,
          receiptUrl: receipts[0] || null, // Keep for backward compatibility
          receiptUrls: receipts, // New field for multiple receipts
          isFinalPayment: true,
        });
      }

      return await updateTransaction(id, {
        paymentStatus: "paid",
        paidAmount: totalAmount,
        paidDate: dateToUse,
        payments: payments,
      });
    },
    [transactions, updateTransaction]
  );

  // Delete a specific payment from a transaction
  const deletePayment = useCallback(
    async (transactionId, paymentId) => {
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction) return { success: false, error: "Transaction not found" };

      const payments = [...(transaction.payments || [])];
      const paymentIndex = payments.findIndex(p => p.id === paymentId);

      if (paymentIndex === -1) {
        return { success: false, error: "Payment not found" };
      }

      // Remove the payment
      payments.splice(paymentIndex, 1);

      // Recalculate paid amount
      const newPaidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalAmount = transaction.amount || 0;

      // Determine new payment status
      let paymentStatus = "pending";
      if (newPaidAmount >= totalAmount) {
        paymentStatus = "paid";
      } else if (newPaidAmount > 0) {
        paymentStatus = "partial";
      }

      return await updateTransaction(transactionId, {
        payments: payments,
        paidAmount: newPaidAmount,
        paymentStatus: paymentStatus,
        paidDate: paymentStatus === "paid" ? new Date().toISOString() : null,
      });
    },
    [transactions, updateTransaction]
  );

  const getPendingPayments = useCallback(() => {
    return transactions.filter(t => t.paymentStatus === "pending" || t.paymentStatus === "partial");
  }, [transactions]);

  const getRecentTransactions = useCallback(
    (limit = 10) => {
      return [...transactions]
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, limit);
    },
    [transactions]
  );

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
  }, [queryClient]);

  // Load all remaining pages (for components that need complete data)
  const loadAll = useCallback(async () => {
    while (hasNextPage) {
      await fetchNextPage();
    }
  }, [hasNextPage, fetchNextPage]);

  return {
    transactions,
    loading,
    error: error?.message || null,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    recordPayment,
    markFullPaid,
    deletePayment,
    getPendingPayments,
    getRecentTransactions,
    refresh,
    // Pagination helpers
    totalCount,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    loadAll,
  };
}

export default useTransactions;
