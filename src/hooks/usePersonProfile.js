"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CACHE_SETTINGS } from "@/lib/constants";
import { getPersonProfileKey } from "@/lib/entity-list-cache";

/**
 * Resolve a supplier/customer for profile pages.
 * Uses the list cache first, then falls back to an id-specific fetch when needed.
 */
export function usePersonProfile(
  type,
  id,
  { suppliers = [], customers = [], listLoading = false } = {}
) {
  const queryClient = useQueryClient();
  const isSupplier = type === "supplier";
  const isValidType = isSupplier || type === "customer";
  const profileKey = id && isValidType ? getPersonProfileKey(type, id) : null;

  const listPerson = useMemo(() => {
    if (!id) return null;
    if (isSupplier) {
      return suppliers.find(s => s.id === id) ?? null;
    }
    return customers.find(c => c.id === id) ?? null;
  }, [isSupplier, suppliers, customers, id]);

  const {
    data: fetchedPerson,
    isPending,
    isFetched,
    isError,
    error: queryError,
  } = useQuery({
    queryKey: profileKey ?? ["person-profile", "invalid", type, id ?? "none"],
    queryFn: async () => {
      const resource = isSupplier ? "suppliers" : "customers";
      const response = await fetch(`/api/${resource}/${id}`);
      const result = await response.json().catch(() => null);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(result?.error || `Failed to load ${resource.slice(0, -1)}`);
      }

      if (!result?.success || !result.data) {
        return null;
      }

      return result.data;
    },
    enabled: Boolean(id) && isValidType && !listPerson,
    placeholderData: () => {
      if (listPerson) return listPerson;
      if (profileKey) {
        return queryClient.getQueryData(profileKey) ?? undefined;
      }
      return undefined;
    },
    staleTime: CACHE_SETTINGS.STALE_TIME,
    retry: CACHE_SETTINGS.RETRY_COUNT,
  });

  const person = fetchedPerson ?? listPerson ?? null;
  const loading =
    Boolean(id) && isValidType && !person && (isPending || listLoading || (!isFetched && !listPerson));
  const notFound = Boolean(id) && isValidType && isFetched && fetchedPerson === null && !isError;
  const error = isError ? queryError?.message || "Failed to load profile" : null;

  return {
    person,
    loading,
    notFound,
    error,
    isError,
    isSupplier,
  };
}

export default usePersonProfile;
