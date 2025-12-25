"use client";

import { useQuery } from "@tanstack/react-query";

const STORAGE_KEY = ["r2-storage"];

/**
 * Fetch storage usage from Cloudflare R2
 */
async function fetchStorageInfo() {
  const response = await fetch("/api/storage");
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Failed to fetch storage info");
  }

  return data.data;
}

export function useStorage() {
  const {
    data: storageInfo,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: STORAGE_KEY,
    queryFn: fetchStorageInfo,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    storageInfo,
    loading,
    error: error?.message || null,
    refetch,
  };
}

export default useStorage;
