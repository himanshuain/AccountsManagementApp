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
  seedPersonProfileCache,
  upsertEntityInCaches,
  getPersonProfileKey,
} from "@/lib/entity-list-cache";

const CUSTOMERS_KEY = ["customers"];
const STATS_KEY = ["stats"];

/**
 * @param {Object} options
 * @param {boolean} options.fetchAll - If true, fetches all customers in one request (home page, search)
 * @param {boolean} options.enabled - If false, skips all network work
 */
export function useCustomers({ fetchAll = false, enabled = true } = {}) {
  const queryClient = useQueryClient();

  const queryKey = fetchAll ? [...CUSTOMERS_KEY, { fetchAll }] : CUSTOMERS_KEY;

  const allDataQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch("/api/customers?limit=0");
      if (!response.ok) {
        throw new Error("Failed to fetch customers");
      }
      const result = await response.json();
      return result.data || [];
    },
    enabled: enabled && fetchAll,
    staleTime: CACHE_SETTINGS.STALE_TIME,
    retry: CACHE_SETTINGS.RETRY_COUNT,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const paginatedQuery = useInfiniteQuery({
    queryKey: CUSTOMERS_KEY,
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetch(`/api/customers?page=${pageParam}&limit=${PAGE_SIZE.CUSTOMERS}`);
      if (!response.ok) {
        throw new Error("Failed to fetch customers");
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
    enabled: enabled && !fetchAll,
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

  const customers = useMemo(() => {
    if (fetchAll) {
      return data || [];
    }
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.data);
  }, [data, fetchAll]);

  const totalCount = useMemo(() => {
    if (fetchAll) {
      return customers.length;
    }
    return data?.pages?.[0]?.pagination?.total ?? customers.length;
  }, [data, customers.length, fetchAll]);

  // Add customer mutation with cache update for home (fetchAll) and paginated lists
  const addMutation = useMutation({
    mutationFn: async customerData => {
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
    onMutate: async newCustomer => {
      await queryClient.cancelQueries({ queryKey: CUSTOMERS_KEY });
      const snapshot = snapshotEntityCaches(queryClient, CUSTOMERS_KEY);
      const tempId = `temp-${Date.now()}`;
      const optimisticCustomer = {
        ...newCustomer,
        id: tempId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      prependEntityToCaches(queryClient, CUSTOMERS_KEY, optimisticCustomer);
      return { snapshot, tempId };
    },
    onSuccess: (result, _vars, context) => {
      const created = result?.data;
      if (created?.id) {
        if (context?.tempId) {
          replaceEntityInCaches(queryClient, CUSTOMERS_KEY, context.tempId, created);
        } else {
          upsertEntityInCaches(queryClient, CUSTOMERS_KEY, created);
        }
        seedPersonProfileCache(queryClient, "customer", created);
      }
    },
    onError: (_err, _vars, context) => {
      restoreEntityCaches(queryClient, CUSTOMERS_KEY, context?.snapshot);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
    },
  });

  // Update customer mutation with optimistic update
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
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: CUSTOMERS_KEY });
      const snapshot = snapshotEntityCaches(queryClient, CUSTOMERS_KEY);
      patchEntityInCaches(queryClient, CUSTOMERS_KEY, id, updates);
      return { snapshot };
    },
    onError: (_err, _vars, context) => {
      restoreEntityCaches(queryClient, CUSTOMERS_KEY, context?.snapshot);
    },
    onSuccess: result => {
      const updated = result?.data;
      if (updated?.id) {
        upsertEntityInCaches(queryClient, CUSTOMERS_KEY, updated);
        seedPersonProfileCache(queryClient, "customer", updated);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
    },
  });

  // Delete customer mutation with optimistic update
  const deleteMutation = useMutation({
    mutationFn: async id => {
      const response = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete customer");
      }
      return id;
    },
    onMutate: async id => {
      await queryClient.cancelQueries({ queryKey: CUSTOMERS_KEY });
      const snapshot = snapshotEntityCaches(queryClient, CUSTOMERS_KEY);
      removeEntityFromCaches(queryClient, CUSTOMERS_KEY, id);
      return { snapshot };
    },
    onError: (_err, _id, context) => {
      restoreEntityCaches(queryClient, CUSTOMERS_KEY, context?.snapshot);
    },
    onSuccess: deletedId => {
      if (deletedId) {
        queryClient.removeQueries({ queryKey: getPersonProfileKey("customer", deletedId) });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
    },
  });

  const addCustomer = useCallback(
    async customerData => {
      try {
        const result = await addMutation.mutateAsync(customerData);
        return { success: true, data: result.data };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
    [addMutation]
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
    [updateMutation]
  );

  const deleteCustomer = useCallback(
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

  const searchCustomers = useCallback(
    query => {
      if (!query.trim()) {
        return customers;
      }
      const lowerQuery = query.toLowerCase();
      return customers.filter(
        c => c.name?.toLowerCase().includes(lowerQuery) || c.phone?.includes(query)
      );
    },
    [customers]
  );

  const getCustomerById = useCallback(
    id => {
      const fromList = customers.find(c => c.id === id);
      if (fromList) return fromList;
      return queryClient.getQueryData(getPersonProfileKey("customer", id)) || null;
    },
    [customers, queryClient]
  );

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
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
    customers,
    loading,
    error: error?.message || null,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    searchCustomers,
    getCustomerById,
    refresh,
    // Pagination helpers
    totalCount,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    loadAll,
  };
}

export default useCustomers;
