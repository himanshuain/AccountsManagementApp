"use client";

import { useCallback, useMemo } from "react";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PAGE_SIZE, CACHE_SETTINGS } from "@/lib/constants";
import {
  snapshotEntityCaches,
  restoreEntityCaches,
  prependEntityToCaches,
  replaceEntityInCaches,
  patchEntityInCaches,
  removeEntityFromCaches,
} from "@/lib/entity-list-cache";

const SUPPLIERS_KEY = ["suppliers"];
const TRANSACTIONS_KEY = ["transactions"];
const STATS_KEY = ["stats"];

/**
 * @param {Object} options
 * @param {boolean} options.fetchAll - If true, fetches all suppliers in one request (home page, search)
 */
export function useSuppliers({ fetchAll = false } = {}) {
  const queryClient = useQueryClient();

  const queryKey = fetchAll ? [...SUPPLIERS_KEY, { fetchAll }] : SUPPLIERS_KEY;

  const allDataQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch("/api/suppliers?limit=0");
      if (!response.ok) {
        throw new Error("Failed to fetch suppliers");
      }
      const result = await response.json();
      return result.data || [];
    },
    enabled: fetchAll,
    staleTime: CACHE_SETTINGS.STALE_TIME,
    retry: CACHE_SETTINGS.RETRY_COUNT,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const paginatedQuery = useInfiniteQuery({
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
    enabled: !fetchAll,
    staleTime: CACHE_SETTINGS.STALE_TIME,
    retry: CACHE_SETTINGS.RETRY_COUNT,
  });

  const {
    data,
    isLoading: loading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = fetchAll
    ? {
        data: allDataQuery.data,
        isLoading: allDataQuery.isLoading,
        error: allDataQuery.error,
        refetch: allDataQuery.refetch,
        fetchNextPage: () => {},
        hasNextPage: false,
        isFetchingNextPage: false,
      }
    : paginatedQuery;

  const suppliers = useMemo(() => {
    if (fetchAll) {
      return data || [];
    }
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.data);
  }, [data, fetchAll]);

  const totalCount = useMemo(() => {
    if (fetchAll) {
      return suppliers.length;
    }
    return data?.pages?.[0]?.pagination?.total ?? suppliers.length;
  }, [data, suppliers.length, fetchAll]);

  // Add supplier mutation with optimistic update
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
    onMutate: async newSupplier => {
      await queryClient.cancelQueries({ queryKey: SUPPLIERS_KEY });
      const snapshot = snapshotEntityCaches(queryClient, SUPPLIERS_KEY);
      const tempId = `temp-${Date.now()}`;
      const optimisticSupplier = {
        ...newSupplier,
        id: tempId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      prependEntityToCaches(queryClient, SUPPLIERS_KEY, optimisticSupplier);
      return { snapshot, tempId };
    },
    onSuccess: (result, _vars, context) => {
      const created = result?.data;
      if (created?.id && context?.tempId) {
        replaceEntityInCaches(queryClient, SUPPLIERS_KEY, context.tempId, created);
      }
    },
    onError: (_err, _vars, context) => {
      restoreEntityCaches(queryClient, SUPPLIERS_KEY, context?.snapshot);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
    },
  });

  // Update supplier mutation with optimistic update
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
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: SUPPLIERS_KEY });
      const snapshot = snapshotEntityCaches(queryClient, SUPPLIERS_KEY);
      patchEntityInCaches(queryClient, SUPPLIERS_KEY, id, updates);
      return { snapshot };
    },
    onError: (_err, _vars, context) => {
      restoreEntityCaches(queryClient, SUPPLIERS_KEY, context?.snapshot);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SUPPLIERS_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
    },
  });

  // Delete supplier mutation with optimistic update
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
    onMutate: async id => {
      await queryClient.cancelQueries({ queryKey: SUPPLIERS_KEY });
      const snapshot = snapshotEntityCaches(queryClient, SUPPLIERS_KEY);
      removeEntityFromCaches(queryClient, SUPPLIERS_KEY, id);
      return { snapshot };
    },
    onError: (_err, _id, context) => {
      restoreEntityCaches(queryClient, SUPPLIERS_KEY, context?.snapshot);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SUPPLIERS_KEY });
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
    },
  });

  const addSupplier = useCallback(
    async supplierData => {
      try {
        const result = await addMutation.mutateAsync(supplierData);
        return { success: true, data: result.data };
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
    let hasMore = true;
    let safety = 0;
    while (hasMore && safety < 50) {
      const result = await fetchNextPage();
      const pages = result?.data?.pages || [];
      const lastPage = pages[pages.length - 1];
      hasMore = !!lastPage?.pagination?.hasMore;
      safety += 1;
      if (!lastPage) break;
    }
  }, [fetchNextPage]);

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
