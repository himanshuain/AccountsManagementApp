"use client";

import { useCallback, useMemo } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PAGE_SIZE, CACHE_SETTINGS } from "@/lib/constants";

const UDHAR_KEY = ["udhar"];
const CUSTOMERS_KEY = ["customers"];
const STATS_KEY = ["stats"];

export function useUdhar() {
  const queryClient = useQueryClient();

  // Fetch udhar with pagination using infinite query
  const {
    data,
    isLoading: loading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: UDHAR_KEY,
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetch(`/api/udhar?page=${pageParam}&limit=${PAGE_SIZE.UDHAR}`);
      if (!response.ok) {
        throw new Error("Failed to fetch udhar");
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
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Flatten all pages into a single array for backward compatibility
  const udharList = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.data);
  }, [data]);

  // Get total count from the first page's pagination
  const totalCount = useMemo(() => {
    return data?.pages?.[0]?.pagination?.total ?? udharList.length;
  }, [data, udharList.length]);

  // Add udhar mutation - directly to cloud
  const addMutation = useMutation({
    mutationFn: async udharData => {
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
      // Refetch all udhar queries immediately
      queryClient.refetchQueries({ queryKey: UDHAR_KEY, type: "all" });
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
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
      // Refetch all udhar queries immediately
      queryClient.refetchQueries({ queryKey: UDHAR_KEY, type: "all" });
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
    },
  });

  // Delete udhar mutation with optimistic update
  const deleteMutation = useMutation({
    mutationFn: async id => {
      const response = await fetch(`/api/udhar/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete udhar");
      }
      return id;
    },
    onMutate: async id => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: UDHAR_KEY });
      // Snapshot the previous value
      const previousData = queryClient.getQueryData(UDHAR_KEY);
      // Optimistically remove the item
      queryClient.setQueryData(UDHAR_KEY, old => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            data: page.data.filter(u => u.id !== id),
          })),
        };
      });
      return { previousData };
    },
    onError: (err, id, context) => {
      // Roll back on error
      queryClient.setQueryData(UDHAR_KEY, context?.previousData);
    },
    onSettled: () => {
      // Refetch all udhar queries immediately
      queryClient.refetchQueries({ queryKey: UDHAR_KEY, type: "all" });
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
    },
  });

  const addUdhar = useCallback(
    async udharData => {
      try {
        const result = await addMutation.mutateAsync(udharData);
        return { success: true, data: result?.data };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    [addMutation]
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
    [updateMutation]
  );

  const deleteUdhar = useCallback(
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

  const recordDeposit = useCallback(
    async (id, amount, receiptUrls = null, notes = null, paymentDate = null, isReturn = false) => {
      const udhar = udharList.find(u => u.id === id);
      if (!udhar) return { success: false, error: "Record not found" };

      const totalAmount = udhar.amount || (udhar.cashAmount || 0) + (udhar.onlineAmount || 0);
      const currentPaid = udhar.paidAmount || (udhar.paidCash || 0) + (udhar.paidOnline || 0);
      // Return payments don't add to paid amount
      const effectiveAmount = isReturn ? 0 : amount;
      const newPaidAmount = currentPaid + effectiveAmount;

      // Support both single URL (string) and array of URLs
      const receipts = receiptUrls
        ? Array.isArray(receiptUrls)
          ? receiptUrls
          : [receiptUrls]
        : [];

      const newPayment = {
        id: crypto.randomUUID(),
        amount: amount,
        date: paymentDate || new Date().toISOString(),
        receiptUrl: receipts[0] || null, // Keep for backward compatibility
        receiptUrls: receipts, // New field for multiple receipts
        notes: notes,
        isReturn: isReturn,
      };

      const updates = {
        payments: [...(udhar.payments || []), newPayment],
        paidAmount: newPaidAmount,
        paidCash: (udhar.paidCash || 0) + effectiveAmount,
        paymentStatus: newPaidAmount >= totalAmount ? "paid" : "partial",
      };

      return await updateUdhar(id, updates);
    },
    [udharList, updateUdhar]
  );

  const markFullPaid = useCallback(
    async (id, receiptUrls = null, paymentDate = null) => {
      const udhar = udharList.find(u => u.id === id);
      if (!udhar) return { success: false, error: "Record not found" };

      const totalAmount = udhar.amount || (udhar.cashAmount || 0) + (udhar.onlineAmount || 0);
      const currentPaid = udhar.paidAmount || (udhar.paidCash || 0) + (udhar.paidOnline || 0);
      const remainingAmount = totalAmount - currentPaid;

      // Support both single URL (string) and array of URLs
      const receipts = receiptUrls
        ? Array.isArray(receiptUrls)
          ? receiptUrls
          : [receiptUrls]
        : [];

      const payments = [...(udhar.payments || [])];
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

      return await updateUdhar(id, {
        paymentStatus: "paid",
        paidAmount: totalAmount,
        paidCash: totalAmount,
        paidDate: dateToUse,
        payments: payments,
      });
    },
    [udharList, updateUdhar]
  );

  // Update a specific payment in an udhar record
  const updatePayment = useCallback(
    async (udharId, paymentId, paymentUpdates) => {
      const udhar = udharList.find(u => u.id === udharId);
      if (!udhar) return { success: false, error: "Record not found" };

      const payments = [...(udhar.payments || [])];
      const paymentIndex = payments.findIndex(p => p.id === paymentId);

      if (paymentIndex === -1) {
        return { success: false, error: "Payment not found" };
      }

      // Get the old payment amount to calculate the difference
      const oldPayment = payments[paymentIndex];
      const oldAmount = Number(oldPayment.amount) || 0;
      const newAmount = Number(paymentUpdates.amount) || oldAmount;
      const oldIsReturn = !!oldPayment.isReturn;
      const newIsReturn = paymentUpdates.isReturn !== undefined ? !!paymentUpdates.isReturn : oldIsReturn;
      
      // Calculate effective amounts (returns don't count toward paid)
      const oldEffective = oldIsReturn ? 0 : oldAmount;
      const newEffective = newIsReturn ? 0 : newAmount;
      const amountDiff = newEffective - oldEffective;

      // Update the payment
      payments[paymentIndex] = {
        ...oldPayment,
        ...paymentUpdates,
        amount: newAmount,
        isReturn: newIsReturn,
      };

      // Recalculate paid amount
      const currentPaid = udhar.paidAmount || (udhar.paidCash || 0) + (udhar.paidOnline || 0);
      const newPaidAmount = currentPaid + amountDiff;
      const totalAmount = udhar.amount || (udhar.cashAmount || 0) + (udhar.onlineAmount || 0);

      // Determine new payment status
      let paymentStatus = "pending";
      if (newPaidAmount >= totalAmount) {
        paymentStatus = "paid";
      } else if (newPaidAmount > 0) {
        paymentStatus = "partial";
      }

      return await updateUdhar(udharId, {
        payments: payments,
        paidAmount: newPaidAmount,
        paidCash: newPaidAmount,
        paymentStatus: paymentStatus,
        paidDate: paymentStatus === "paid" ? new Date().toISOString() : null,
      });
    },
    [udharList, updateUdhar]
  );

  // Delete a specific payment from an udhar record
  const deletePayment = useCallback(
    async (udharId, paymentId) => {
      const udhar = udharList.find(u => u.id === udharId);
      if (!udhar) return { success: false, error: "Record not found" };

      const payments = [...(udhar.payments || [])];
      const paymentIndex = payments.findIndex(p => p.id === paymentId);

      if (paymentIndex === -1) {
        return { success: false, error: "Payment not found" };
      }

      // Remove the payment
      payments.splice(paymentIndex, 1);

      // Recalculate paid amount
      const newPaidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalAmount = udhar.amount || (udhar.cashAmount || 0) + (udhar.onlineAmount || 0);

      // Determine new payment status
      let paymentStatus = "pending";
      if (newPaidAmount >= totalAmount) {
        paymentStatus = "paid";
      } else if (newPaidAmount > 0) {
        paymentStatus = "partial";
      }

      return await updateUdhar(udharId, {
        payments: payments,
        paidAmount: newPaidAmount,
        paidCash: newPaidAmount, // Assuming all payments are cash for simplicity
        paymentStatus: paymentStatus,
        paidDate: paymentStatus === "paid" ? new Date().toISOString() : null,
      });
    },
    [udharList, updateUdhar]
  );

  const getByCustomer = useCallback(
    customerId => {
      return udharList.filter(u => u.customerId === customerId);
    },
    [udharList]
  );

  const getPending = useCallback(() => {
    return udharList.filter(u => u.paymentStatus === "pending");
  }, [udharList]);

  const getRecent = useCallback(
    (limit = 10) => {
      return [...udharList]
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, limit);
    },
    [udharList]
  );

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: UDHAR_KEY });
  }, [queryClient]);

  const filterByDateRange = useCallback(
    days => {
      const now = new Date();
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - days);

      return udharList.filter(u => {
        const date = new Date(u.date);
        return date >= startDate && date <= now;
      });
    },
    [udharList]
  );

  const sortByAmount = useCallback(
    (order = "desc") => {
      return [...udharList].sort((a, b) => {
        const amountA = a.amount || (a.cashAmount || 0) + (a.onlineAmount || 0);
        const amountB = b.amount || (b.cashAmount || 0) + (b.onlineAmount || 0);
        return order === "desc" ? amountB - amountA : amountA - amountB;
      });
    },
    [udharList]
  );

  // Load all remaining pages (for components that need complete data)
  const loadAll = useCallback(async () => {
    while (hasNextPage) {
      await fetchNextPage();
    }
  }, [hasNextPage, fetchNextPage]);

  return {
    udharList,
    loading,
    error: error?.message || null,
    addUdhar,
    updateUdhar,
    deleteUdhar,
    recordDeposit,
    markFullPaid,
    updatePayment,
    deletePayment,
    getByCustomer,
    getPending,
    getRecent,
    filterByDateRange,
    sortByAmount,
    refresh,
    // Pagination helpers
    totalCount,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    loadAll,
  };
}

export default useUdhar;
