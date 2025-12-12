"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supplierDB, bulkOperations } from "@/lib/db";
import { syncManager } from "@/lib/sync";

const SUPPLIERS_KEY = ["suppliers"];

export function useSuppliers() {
  const queryClient = useQueryClient();

  // Fetch suppliers - uses React Query caching
  const {
    data: suppliers = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: SUPPLIERS_KEY,
    queryFn: async () => {
      // Get local data first
      let data = await supplierDB.getAll();

      // Try to fetch from cloud and merge
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch("/api/suppliers", {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json();
          const cloudData = result.data;
          if (cloudData && cloudData.length > 0) {
            await bulkOperations.mergeSuppliers(cloudData);
            data = await supplierDB.getAll();
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

  // Add supplier mutation
  const addMutation = useMutation({
    mutationFn: async (supplierData) => {
      const newSupplier = await supplierDB.add(supplierData);
      return newSupplier;
    },
    onSuccess: (newSupplier) => {
      queryClient.setQueryData(SUPPLIERS_KEY, (old = []) => [
        ...old,
        newSupplier,
      ]);
    },
  });

  // Update supplier mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      const updated = await supplierDB.update(id, updates);
      return updated;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(SUPPLIERS_KEY, (old = []) =>
        old.map((s) => (s.id === updated.id ? updated : s)),
      );
    },
  });

  // Delete supplier mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await supplierDB.delete(id);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData(SUPPLIERS_KEY, (old = []) =>
        old.filter((s) => s.id !== id),
      );
    },
  });

  const addSupplier = useCallback(
    async (supplierData) => {
      try {
        const newSupplier = await addMutation.mutateAsync(supplierData);
        return { success: true, data: newSupplier };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    [addMutation],
  );

  const updateSupplier = useCallback(
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

  const deleteSupplier = useCallback(
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

  const searchSuppliers = useCallback(
    async (query) => {
      if (!query.trim()) {
        refetch();
        return;
      }
      try {
        const results = await supplierDB.search(query);
        queryClient.setQueryData(SUPPLIERS_KEY, results);
      } catch (err) {
        console.error("Search failed:", err);
      }
    },
    [refetch, queryClient],
  );

  const getSupplierById = useCallback(
    async (id) => {
      // First check cache
      const cached = queryClient.getQueryData(SUPPLIERS_KEY);
      const fromCache = cached?.find((s) => s.id === id);
      if (fromCache) return fromCache;

      // Otherwise fetch from DB
      try {
        return await supplierDB.getById(id);
      } catch (err) {
        return null;
      }
    },
    [queryClient],
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
