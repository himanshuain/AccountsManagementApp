"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { incomeDB } from "@/lib/db";

const INCOME_KEY = ["income"];

export function useIncome() {
  const queryClient = useQueryClient();

  const {
    data: incomeList = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: INCOME_KEY,
    queryFn: async () => {
      return await incomeDB.getAll();
    },
    staleTime: 1000 * 60 * 5,
  });

  const addMutation = useMutation({
    mutationFn: async (incomeData) => {
      return await incomeDB.add(incomeData);
    },
    onSuccess: (newIncome) => {
      queryClient.setQueryData(INCOME_KEY, (old = []) => [...old, newIncome]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      return await incomeDB.update(id, updates);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(INCOME_KEY, (old = []) =>
        old.map((i) => (i.id === updated.id ? updated : i)),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await incomeDB.delete(id);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData(INCOME_KEY, (old = []) =>
        old.filter((i) => i.id !== id),
      );
    },
  });

  const addIncome = useCallback(
    async (incomeData) => {
      try {
        const newIncome = await addMutation.mutateAsync(incomeData);
        return { success: true, data: newIncome };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    [addMutation],
  );

  const updateIncome = useCallback(
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

  const deleteIncome = useCallback(
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

  const getByDateRange = useCallback(
    (startDate, endDate) => {
      return incomeList.filter((i) => {
        const date = new Date(i.date);
        return date >= new Date(startDate) && date <= new Date(endDate);
      });
    },
    [incomeList],
  );

  const getDailyIncome = useCallback(() => {
    return incomeList.filter((i) => i.type === "daily");
  }, [incomeList]);

  const getMonthlyIncome = useCallback(() => {
    return incomeList.filter((i) => i.type === "monthly");
  }, [incomeList]);

  const getTotalIncome = useCallback(
    (type = null) => {
      const filtered = type
        ? incomeList.filter((i) => i.type === type)
        : incomeList;
      return filtered.reduce((sum, i) => sum + (i.amount || 0), 0);
    },
    [incomeList],
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
