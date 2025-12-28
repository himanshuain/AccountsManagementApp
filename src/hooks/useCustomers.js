"use client";

import { useCallback, useMemo } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PAGE_SIZE, CACHE_SETTINGS } from "@/lib/constants";

const CUSTOMERS_KEY = ["customers"];
const STATS_KEY = ["stats"];

export function useCustomers() {
  const queryClient = useQueryClient();

  // Fetch customers with pagination using infinite query
  const {
    data,
    isLoading: loading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
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
    staleTime: CACHE_SETTINGS.STALE_TIME,
    retry: CACHE_SETTINGS.RETRY_COUNT,
  });

  // Flatten all pages into a single array for backward compatibility
  const customers = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.data);
  }, [data]);

  // Get total count from the first page's pagination
  const totalCount = useMemo(() => {
    return data?.pages?.[0]?.pagination?.total ?? customers.length;
  }, [data, customers.length]);

  // Add customer mutation - directly to cloud
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
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
      queryClient.invalidateQueries({ queryKey: STATS_KEY });
    },
  });

  // Delete customer mutation - directly to cloud
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
    onSuccess: () => {
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
      return customers.find(c => c.id === id) || null;
    },
    [customers]
  );

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
  }, [queryClient]);

  // Load all remaining pages (for components that need complete data)
  const loadAll = useCallback(async () => {
    while (hasNextPage) {
      await fetchNextPage();
    }
  }, [hasNextPage, fetchNextPage]);

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
