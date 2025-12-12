"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerDB } from "@/lib/db";

const CUSTOMERS_KEY = ["customers"];

export function useCustomers() {
  const queryClient = useQueryClient();

  const {
    data: customers = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: CUSTOMERS_KEY,
    queryFn: async () => {
      return await customerDB.getAll();
    },
    staleTime: 1000 * 60 * 5,
  });

  const addMutation = useMutation({
    mutationFn: async (customerData) => {
      return await customerDB.add(customerData);
    },
    onSuccess: (newCustomer) => {
      queryClient.setQueryData(CUSTOMERS_KEY, (old = []) => [
        ...old,
        newCustomer,
      ]);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      return await customerDB.update(id, updates);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(CUSTOMERS_KEY, (old = []) =>
        old.map((c) => (c.id === updated.id ? updated : c)),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await customerDB.delete(id);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData(CUSTOMERS_KEY, (old = []) =>
        old.filter((c) => c.id !== id),
      );
    },
  });

  const addCustomer = useCallback(
    async (customerData) => {
      try {
        const newCustomer = await addMutation.mutateAsync(customerData);
        return { success: true, data: newCustomer };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    [addMutation],
  );

  const updateCustomer = useCallback(
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

  const deleteCustomer = useCallback(
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

  const searchCustomers = useCallback(
    async (query) => {
      if (!query.trim()) {
        refetch();
        return customers;
      }
      try {
        return await customerDB.search(query);
      } catch (err) {
        console.error("Search failed:", err);
        return [];
      }
    },
    [refetch, customers],
  );

  const getCustomerById = useCallback(
    async (id) => {
      const cached = queryClient.getQueryData(CUSTOMERS_KEY);
      const fromCache = cached?.find((c) => c.id === id);
      if (fromCache) return fromCache;

      try {
        return await customerDB.getById(id);
      } catch (err) {
        return null;
      }
    },
    [queryClient],
  );

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
  }, [queryClient]);

  return {
    customers,
    loading,
    error: error?.message || null,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    searchCustomers,
    getCustomerById,
    refresh,
  };
}

export default useCustomers;
