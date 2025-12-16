"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const SUPPLIERS_KEY = ["suppliers"];

export function useSuppliers() {
  const queryClient = useQueryClient();

  // Fetch suppliers directly from cloud API
  const {
    data: suppliers = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: SUPPLIERS_KEY,
    queryFn: async () => {
      const response = await fetch("/api/suppliers");
      if (!response.ok) {
        throw new Error("Failed to fetch suppliers");
      }
      const result = await response.json();
      return result.data || [];
    },
    staleTime: 1000 * 60 * 2, // Consider data fresh for 2 minutes
    retry: 2,
  });

  // Add supplier mutation - directly to cloud
  const addMutation = useMutation({
    mutationFn: async supplierData => {
      const response = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supplierData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add supplier");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPPLIERS_KEY });
    },
  });

  // Update supplier mutation - directly to cloud
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const response = await fetch(`/api/suppliers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update supplier");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPPLIERS_KEY });
    },
  });

  // Delete supplier mutation - directly to cloud
  const deleteMutation = useMutation({
    mutationFn: async id => {
      const response = await fetch(`/api/suppliers/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete supplier");
      }
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPPLIERS_KEY });
    },
  });

  const addSupplier = useCallback(
    async supplierData => {
      try {
        await addMutation.mutateAsync(supplierData);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    [addMutation]
  );

  const updateSupplier = useCallback(
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

  const deleteSupplier = useCallback(
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

  const searchSuppliers = useCallback(
    query => {
      if (!query.trim()) {
        return suppliers;
      }
      const lowerQuery = query.toLowerCase();
      return suppliers.filter(
        s =>
          s.name?.toLowerCase().includes(lowerQuery) ||
          s.companyName?.toLowerCase().includes(lowerQuery) ||
          s.phone?.includes(query)
      );
    },
    [suppliers]
  );

  const getSupplierById = useCallback(
    id => {
      return suppliers.find(s => s.id === id) || null;
    },
    [suppliers]
  );

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: SUPPLIERS_KEY });
  }, [queryClient]);

  return {
    suppliers,
    loading,
    error: error?.message || null,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    searchSuppliers,
    getSupplierById,
    refresh,
  };
}

export default useSuppliers;
