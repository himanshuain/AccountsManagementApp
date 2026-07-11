"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CACHE_SETTINGS } from "@/lib/constants";

/**
 * Resolve a supplier/customer for profile pages.
 * Checks the paginated list first, then fetches by ID if missing (e.g. newly created or page 2+).
 */
export function usePersonProfile(type, id, { suppliers = [], customers = [], listLoading = false } = {}) {
  const isSupplier = type === "supplier";

  const listPerson = useMemo(() => {
    if (isSupplier) {
      return suppliers.find(s => s.id === id);
    }
    return customers.find(c => c.id === id);
  }, [isSupplier, suppliers, customers, id]);

  const needsFetch = Boolean(id) && !listLoading && !listPerson;

  const { data: fetchedPerson, isFetched: fetchSettled } = useQuery({
    queryKey: ["person-profile", type, id],
    queryFn: async () => {
      const resource = isSupplier ? "suppliers" : "customers";
      const response = await fetch(`/api/${resource}/${id}`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        return null;
      }
      return result.data;
    },
    enabled: needsFetch,
    staleTime: CACHE_SETTINGS.STALE_TIME,
    retry: false,
  });

  const person = listPerson || fetchedPerson || null;
  const loading = listLoading || (needsFetch && !fetchSettled);

  return {
    person,
    loading,
    isSupplier,
  };
}

export default usePersonProfile;
