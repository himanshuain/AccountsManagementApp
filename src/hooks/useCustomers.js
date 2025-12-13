"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const CUSTOMERS_KEY = ["customers"];

export function useCustomers() {
  const queryClient = useQueryClient();

  // Fetch customers directly from cloud API
  const {
    data: customers = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: CUSTOMERS_KEY,
    queryFn: async () => {
      const response = await fetch("/api/customers");
      if (!response.ok) {
        throw new Error("Failed to fetch customers");
      }
      const result = await response.json();
      return result.data || [];
    },
    staleTime: 1000 * 60 * 2,
    retry: 2,
  });

  // Add customer mutation - directly to cloud
  const addMutation = useMutation({
    mutationFn: async (customerData) => {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add customer");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
    },
  });

  // Update customer mutation - directly to cloud
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const response = await fetch(`/api/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update customer");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
    },
  });

  // Delete customer mutation - directly to cloud
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete customer");
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
    },
  });

  const addCustomer = useCallback(
    async (customerData) => {
      try {
        const result = await addMutation.mutateAsync(customerData);
        return { success: true, data: result.data };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    [addMutation],
  );

  const updateCustomer = useCallback(
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
    (query) => {
      if (!query.trim()) {
        return customers;
      }
      const lowerQuery = query.toLowerCase();
      return customers.filter(
        (c) =>
          c.name?.toLowerCase().includes(lowerQuery) ||
          c.phone?.includes(query),
      );
    },
    [customers],
  );

  const getCustomerById = useCallback(
    (id) => {
      return customers.find((c) => c.id === id) || null;
    },
    [customers],
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
