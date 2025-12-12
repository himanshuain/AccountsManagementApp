"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { transactionDB, bulkOperations } from "@/lib/db";

const TRANSACTIONS_KEY = ["transactions"];

export function useTransactions(supplierId = null) {
  const queryClient = useQueryClient();

  const queryKey = supplierId
    ? [...TRANSACTIONS_KEY, { supplierId }]
    : TRANSACTIONS_KEY;

  // Fetch transactions - uses React Query caching
  const {
    data: transactions = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      // Get local data first
      let data;
      if (supplierId) {
        data = await transactionDB.getBySupplier(supplierId);
      } else {
        data = await transactionDB.getAll();
      }

      // Try to fetch from cloud and merge
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch("/api/transactions", {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const { data: cloudData } = await response.json();
          if (cloudData && cloudData.length > 0) {
            await bulkOperations.mergeTransactions(cloudData);
            if (supplierId) {
              data = await transactionDB.getBySupplier(supplierId);
            } else {
              data = await transactionDB.getAll();
            }
          }
        }
      } catch (cloudError) {
        console.warn(
          "Cloud fetch failed, using local data:",
          cloudError.message,
        );
      }

      return data;
    },
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });

  // Add transaction mutation
  const addMutation = useMutation({
    mutationFn: async (transactionData) => {
      const newTransaction = await transactionDB.add(transactionData);
      return newTransaction;
    },
    onSuccess: (newTransaction) => {
      // Update both specific supplier transactions and all transactions cache
      queryClient.setQueryData(TRANSACTIONS_KEY, (old = []) => [
        newTransaction,
        ...old,
      ]);
      if (supplierId) {
        queryClient.setQueryData(queryKey, (old = []) => [
          newTransaction,
          ...old,
        ]);
      }
    },
  });

  // Update transaction mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const updated = await transactionDB.update(id, updates);
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(TRANSACTIONS_KEY, (old = []) =>
        old.map((t) => (t.id === updated.id ? updated : t)),
      );
      if (supplierId) {
        queryClient.setQueryData(queryKey, (old = []) =>
          old.map((t) => (t.id === updated.id ? updated : t)),
        );
      }
    },
  });

  // Delete transaction mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await transactionDB.delete(id);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData(TRANSACTIONS_KEY, (old = []) =>
        old.filter((t) => t.id !== id),
      );
      if (supplierId) {
        queryClient.setQueryData(queryKey, (old = []) =>
          old.filter((t) => t.id !== id),
        );
      }
    },
  });

  const addTransaction = useCallback(
    async (transactionData) => {
      try {
        const newTransaction = await addMutation.mutateAsync(transactionData);
        return { success: true, data: newTransaction };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    [addMutation],
  );

  const updateTransaction = useCallback(
    async (id, updates) => {
      try {
        const updated = await updateMutation.mutateAsync({ id, updates });
        return { success: true, data: updated };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    [updateMutation],
  );

  const deleteTransaction = useCallback(
    async (id) => {
      try {
        await deleteMutation.mutateAsync(id);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    [deleteMutation],
  );

  const getPendingPayments = useCallback(async () => {
    return await transactionDB.getPendingPayments();
  }, []);

  const getRecentTransactions = useCallback(async (limit = 10) => {
    return await transactionDB.getRecent(limit);
  }, []);

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
    getPendingPayments,
    getRecentTransactions,
    refresh,
  };
}

export default useTransactions;
