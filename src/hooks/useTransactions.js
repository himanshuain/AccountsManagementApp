"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const TRANSACTIONS_KEY = ["transactions"];

export function useTransactions(supplierId = null) {
  const queryClient = useQueryClient();

  const queryKey = supplierId ? [...TRANSACTIONS_KEY, { supplierId }] : TRANSACTIONS_KEY;

  // Fetch transactions directly from cloud API
  const {
    data: transactions = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const url = supplierId ? `/api/transactions?supplierId=${supplierId}` : "/api/transactions";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }
      const result = await response.json();
      return result.data || [];
    },
    staleTime: 1000 * 60 * 2,
    retry: 2,
  });

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
    },
  });

  const addTransaction = useCallback(
    async transactionData => {
      try {
        await addMutation.mutateAsync(transactionData);
        return { success: true };
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
    async (id, amount, receiptUrl = null, paymentDate = null) => {
      const transaction = transactions.find(t => t.id === id);
      if (!transaction) return { success: false, error: "Transaction not found" };

      const totalAmount = transaction.amount || 0;
      const currentPaid = transaction.paidAmount || 0;
      const newPaidAmount = currentPaid + amount;

      const newPayment = {
        id: crypto.randomUUID(),
        amount: amount,
        date: paymentDate || new Date().toISOString(),
        receiptUrl: receiptUrl,
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
    async (id, receiptUrl = null, paymentDate = null) => {
      const transaction = transactions.find(t => t.id === id);
      if (!transaction) return { success: false, error: "Transaction not found" };

      const totalAmount = transaction.amount || 0;
      const currentPaid = transaction.paidAmount || 0;
      const remainingAmount = totalAmount - currentPaid;

      const payments = [...(transaction.payments || [])];
      const dateToUse = paymentDate || new Date().toISOString();
      if (remainingAmount > 0) {
        payments.push({
          id: crypto.randomUUID(),
          amount: remainingAmount,
          date: dateToUse,
          receiptUrl: receiptUrl,
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
  };
}

export default useTransactions;
