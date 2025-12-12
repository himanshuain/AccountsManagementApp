"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { udharDB, customerDB } from "@/lib/db";

const UDHAR_KEY = ["udhar"];
const CUSTOMERS_KEY = ["customers"];

export function useUdhar() {
  const queryClient = useQueryClient();

  const {
    data: udharList = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: UDHAR_KEY,
    queryFn: async () => {
      return await udharDB.getAll();
    },
    staleTime: 1000 * 60 * 5,
  });

  const addMutation = useMutation({
    mutationFn: async (udharData) => {
      return await udharDB.add(udharData);
    },
    onSuccess: (newUdhar) => {
      queryClient.setQueryData(UDHAR_KEY, (old = []) => [...old, newUdhar]);
      // Invalidate customers to update totalPending
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      return await udharDB.update(id, updates);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(UDHAR_KEY, (old = []) =>
        old.map((u) => (u.id === updated.id ? updated : u)),
      );
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await udharDB.delete(id);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData(UDHAR_KEY, (old = []) =>
        old.filter((u) => u.id !== id),
      );
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
    },
  });

  const addUdhar = useCallback(
    async (udharData) => {
      try {
        const newUdhar = await addMutation.mutateAsync(udharData);
        return { success: true, data: newUdhar };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    [addMutation],
  );

  const updateUdhar = useCallback(
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
    async (id, amount, mode = "cash") => {
      try {
        const updated = await udharDB.recordDeposit(id, amount, mode);
        if (updated) {
          queryClient.setQueryData(UDHAR_KEY, (old = []) =>
            old.map((u) => (u.id === updated.id ? updated : u)),
          );
          queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
          return { success: true, data: updated };
        }
        return { success: false, error: "Record not found" };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    [queryClient],
  );

  const markFullPaid = useCallback(
    async (id) => {
      try {
        const updated = await udharDB.markFullPaid(id);
        if (updated) {
          queryClient.setQueryData(UDHAR_KEY, (old = []) =>
            old.map((u) => (u.id === updated.id ? updated : u)),
          );
          queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
          return { success: true, data: updated };
        }
        return { success: false, error: "Record not found" };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    [queryClient],
  );

  const getByCustomer = useCallback(async (customerId) => {
    try {
      return await udharDB.getByCustomer(customerId);
    } catch (err) {
      return [];
    }
  }, []);

  const getPending = useCallback(async () => {
    try {
      return await udharDB.getPending();
    } catch (err) {
      return [];
    }
  }, []);

  const getRecent = useCallback(async (limit = 10) => {
    try {
      return await udharDB.getRecent(limit);
    } catch (err) {
      return [];
    }
  }, []);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: UDHAR_KEY });
  }, [queryClient]);

  // Filter by date range
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

  // Sort by amount
  const sortByAmount = useCallback(
    (order = "desc") => {
      return [...udharList].sort((a, b) => {
        const amountA = (a.cashAmount || 0) + (a.onlineAmount || 0);
        const amountB = (b.cashAmount || 0) + (b.onlineAmount || 0);
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
