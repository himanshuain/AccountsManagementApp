"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const UDHAR_KEY = ["udhar"];
const CUSTOMERS_KEY = ["customers"];

export function useUdhar() {
  const queryClient = useQueryClient();

  // Fetch udhar directly from cloud API
  const {
    data: udharList = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: UDHAR_KEY,
    queryFn: async () => {
      const response = await fetch("/api/udhar");
      if (!response.ok) {
        throw new Error("Failed to fetch udhar");
      }
      const result = await response.json();
      return result.data || [];
    },
    staleTime: 1000 * 60 * 2,
    retry: 2,
  });

  // Add udhar mutation - directly to cloud
  const addMutation = useMutation({
    mutationFn: async (udharData) => {
      const response = await fetch("/api/udhar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(udharData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add udhar");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UDHAR_KEY });
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
    },
  });

  // Update udhar mutation - directly to cloud
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const response = await fetch(`/api/udhar/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update udhar");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UDHAR_KEY });
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
    },
  });

  // Delete udhar mutation - directly to cloud
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await fetch(`/api/udhar/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete udhar");
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UDHAR_KEY });
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
    },
  });

  const addUdhar = useCallback(
    async (udharData) => {
      try {
        await addMutation.mutateAsync(udharData);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    [addMutation],
  );

  const updateUdhar = useCallback(
    async (id, updates) => {
      try {
        await updateMutation.mutateAsync({ id, updates });
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    [updateMutation],
  );

  const deleteUdhar = useCallback(
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

  const recordDeposit = useCallback(
    async (id, amount, receiptUrl = null, notes = null) => {
      const udhar = udharList.find((u) => u.id === id);
      if (!udhar) return { success: false, error: "Record not found" };

      const totalAmount =
        udhar.amount || (udhar.cashAmount || 0) + (udhar.onlineAmount || 0);
      const currentPaid =
        udhar.paidAmount || (udhar.paidCash || 0) + (udhar.paidOnline || 0);
      const newPaidAmount = currentPaid + amount;

      const newPayment = {
        id: crypto.randomUUID(),
        amount: amount,
        date: new Date().toISOString(),
        receiptUrl: receiptUrl,
        notes: notes,
      };

      const updates = {
        payments: [...(udhar.payments || []), newPayment],
        paidAmount: newPaidAmount,
        paidCash: (udhar.paidCash || 0) + amount,
        paymentStatus: newPaidAmount >= totalAmount ? "paid" : "partial",
      };

      return await updateUdhar(id, updates);
    },
    [udharList, updateUdhar],
  );

  const markFullPaid = useCallback(
    async (id, receiptUrl = null) => {
      const udhar = udharList.find((u) => u.id === id);
      if (!udhar) return { success: false, error: "Record not found" };

      const totalAmount =
        udhar.amount || (udhar.cashAmount || 0) + (udhar.onlineAmount || 0);
      const currentPaid =
        udhar.paidAmount || (udhar.paidCash || 0) + (udhar.paidOnline || 0);
      const remainingAmount = totalAmount - currentPaid;

      const payments = [...(udhar.payments || [])];
      if (remainingAmount > 0) {
        payments.push({
          id: crypto.randomUUID(),
          amount: remainingAmount,
          date: new Date().toISOString(),
          receiptUrl: receiptUrl,
          isFinalPayment: true,
        });
      }

      return await updateUdhar(id, {
        paymentStatus: "paid",
        paidAmount: totalAmount,
        paidCash: totalAmount,
        paidDate: new Date().toISOString(),
        payments: payments,
      });
    },
    [udharList, updateUdhar],
  );

  const getByCustomer = useCallback(
    (customerId) => {
      return udharList.filter((u) => u.customerId === customerId);
    },
    [udharList],
  );

  const getPending = useCallback(() => {
    return udharList.filter((u) => u.paymentStatus === "pending");
  }, [udharList]);

  const getRecent = useCallback(
    (limit = 10) => {
      return [...udharList]
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, limit);
    },
    [udharList],
  );

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: UDHAR_KEY });
  }, [queryClient]);

  const filterByDateRange = useCallback(
    (days) => {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - days);

      return udharList.filter((u) => {
        const date = new Date(u.date);
        return date >= startDate && date <= now;
      });
    },
    [udharList],
  );

  const sortByAmount = useCallback(
    (order = "desc") => {
      return [...udharList].sort((a, b) => {
        const amountA = a.amount || (a.cashAmount || 0) + (a.onlineAmount || 0);
        const amountB = b.amount || (b.cashAmount || 0) + (b.onlineAmount || 0);
        return order === "desc" ? amountB - amountA : amountA - amountB;
      });
    },
    [udharList],
  );

  return {
    udharList,
    loading,
    error: error?.message || null,
    addUdhar,
    updateUdhar,
    deleteUdhar,
    recordDeposit,
    markFullPaid,
    getByCustomer,
    getPending,
    getRecent,
    filterByDateRange,
    sortByAmount,
    refresh,
  };
}

export default useUdhar;
