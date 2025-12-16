"use client";

import { useQuery } from "@tanstack/react-query";

const BANDWIDTH_KEY = ["bandwidth"];

/**
 * Fetch bandwidth usage from ImageKit
 * Falls back to Supabase storage info if ImageKit is not configured
 */
async function fetchBandwidthInfo() {
  // Try ImageKit bandwidth first
  try {
    const response = await fetch("/api/imagekit/bandwidth");
    const data = await response.json();

    if (data.success) {
      return {
        ...data.data,
        type: "bandwidth", // Indicates this is bandwidth data
      };
    }
  } catch (error) {
    console.warn("ImageKit bandwidth fetch failed, falling back to storage");
  }

  // Fallback to Supabase storage
  const response = await fetch("/api/storage");
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Failed to fetch storage info");
  }

  return {
    ...data.data,
    type: "storage", // Indicates this is storage data
  };
}

export function useStorage() {
  const {
    data: storageInfo,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: BANDWIDTH_KEY,
    queryFn: fetchBandwidthInfo,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    storageInfo,
    loading,
    error: error?.message || null,
    refetch,
    // Helper to check if this is bandwidth or storage data
    isBandwidth: storageInfo?.type === "bandwidth",
  };
}

export default useStorage;
