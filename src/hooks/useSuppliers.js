"use client";

import { useCallback, useMemo } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PAGE_SIZE, CACHE_SETTINGS } from "@/lib/constants";

const SUPPLIERS_KEY = ["suppliers"];
const TRANSACTIONS_KEY = ["transactions"];
const STATS_KEY = ["stats"];

export function useSuppliers() {
  const queryClient = useQueryClient();

  // Fetch suppliers with pagination using infinite query
  const {
    data,
    isLoading: loading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: SUPPLIERS_KEY,
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetch(`/api/suppliers?page=${pageParam}&limit=${PAGE_SIZE.SUPPLIERS}`);
      if (!response.ok) {
        throw new Error("Failed to fetch suppliers");
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
  });

  // Flatten all pages into a single array for backward compatibility
  const suppliers = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.data);
  }, [data]);

  // Get total count from the first page's pagination (all pages have same total)
  const totalCount = useMemo(() => {
    return data?.pages?.[0]?.pagination?.total ?? suppliers.length;
  }, [data, suppliers.length]);

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
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
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
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
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
      // Also invalidate transactions since supplier deletion removes related transactions
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      // Invalidate stats to refresh totals
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
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

  // Load all remaining pages (for components that need complete data)
  const loadAll = useCallback(async () => {
    while (hasNextPage) {
      await fetchNextPage();
    }
  }, [hasNextPage, fetchNextPage]);

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
    // Pagination helpers
    totalCount,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    loadAll,
  };
}

export default useSuppliers;
