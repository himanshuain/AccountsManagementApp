"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const INCOME_KEY = ["income"];

export function useIncome() {
  const queryClient = useQueryClient();

  // Fetch income directly from cloud API
  const {
    data: incomeList = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: INCOME_KEY,
    queryFn: async () => {
      const response = await fetch("/api/income");
      if (!response.ok) {
        throw new Error("Failed to fetch income");
      }
      const result = await response.json();
      return result.data || [];
    },
    staleTime: 1000 * 60 * 2,
    retry: 2,
  });

  // Add income mutation with optimistic update
  const addMutation = useMutation({
    mutationFn: async incomeData => {
      const response = await fetch("/api/income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(incomeData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add income");
      }
      return response.json();
    },
    onMutate: async newIncome => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: INCOME_KEY });
      // Snapshot previous value
      const previousIncome = queryClient.getQueryData(INCOME_KEY);
      // Optimistically add new income
      const optimisticIncome = {
        ...newIncome,
        id: `temp-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      queryClient.setQueryData(INCOME_KEY, old => [optimisticIncome, ...(old || [])]);
      return { previousIncome };
    },
    onError: (err, newIncome, context) => {
      // Rollback on error
      queryClient.setQueryData(INCOME_KEY, context?.previousIncome);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: INCOME_KEY });
    },
  });

  // Update income mutation with optimistic update
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const response = await fetch(`/api/income/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update income");
      }
      return response.json();
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: INCOME_KEY });
      const previousIncome = queryClient.getQueryData(INCOME_KEY);
      queryClient.setQueryData(INCOME_KEY, old =>
        (old || []).map(item =>
          item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
        )
      );
      return { previousIncome };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(INCOME_KEY, context?.previousIncome);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: INCOME_KEY });
    },
  });

  // Delete income mutation with optimistic update
  const deleteMutation = useMutation({
    mutationFn: async id => {
      const response = await fetch(`/api/income/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete income");
      }
      return id;
    },
    onMutate: async id => {
      await queryClient.cancelQueries({ queryKey: INCOME_KEY });
      const previousIncome = queryClient.getQueryData(INCOME_KEY);
      queryClient.setQueryData(INCOME_KEY, old => (old || []).filter(item => item.id !== id));
      return { previousIncome };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(INCOME_KEY, context?.previousIncome);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: INCOME_KEY });
    },
  });

  const addIncome = useCallback(
    async incomeData => {
      try {
        await addMutation.mutateAsync(incomeData);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    [addMutation]
  );

  const updateIncome = useCallback(
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

  const deleteIncome = useCallback(
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

  const getByDateRange = useCallback(
    (startDate, endDate) => {
      return incomeList.filter(i => {
        const date = new Date(i.date);
        return date >= new Date(startDate) && date <= new Date(endDate);
      });
    },
    [incomeList]
  );

  const getDailyIncome = useCallback(() => {
    return incomeList.filter(i => i.type === "daily");
  }, [incomeList]);

  const getMonthlyIncome = useCallback(() => {
    return incomeList.filter(i => i.type === "monthly");
  }, [incomeList]);

  const getTotalIncome = useCallback(
    (type = null) => {
      const filtered = type ? incomeList.filter(i => i.type === type) : incomeList;
      return filtered.reduce((sum, i) => sum + (i.amount || 0), 0);
    },
    [incomeList]
  );

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: INCOME_KEY });
  }, [queryClient]);

  return {
    incomeList,
    loading,
    error: error?.message || null,
    addIncome,
    updateIncome,
    deleteIncome,
    getByDateRange,
    getDailyIncome,
    getMonthlyIncome,
    getTotalIncome,
    refresh,
  };
}

export default useIncome;
