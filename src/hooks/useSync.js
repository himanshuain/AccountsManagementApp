"use client";

import { useState, useEffect, useCallback } from "react";
import { syncManager } from "@/lib/sync";
import { syncQueueDB } from "@/lib/db";

export function useSync() {
  const [syncStatus, setSyncStatus] = useState({
    status: "idle",
    pendingCount: 0,
    lastSync: null,
    error: null,
  });

  useEffect(() => {
    // Subscribe to sync manager updates
    const unsubscribe = syncManager.subscribe((status) => {
      setSyncStatus((prev) => ({ ...prev, ...status }));
    });

    // Get initial pending count
    const updatePendingCount = async () => {
      const count = await syncQueueDB.getPendingCount();
      setSyncStatus((prev) => ({ ...prev, pendingCount: count }));
    };

    updatePendingCount();

    // Update pending count periodically
    const interval = setInterval(updatePendingCount, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const triggerSync = useCallback(async () => {
    return await syncManager.triggerSync();
  }, []);

  const forceFullSync = useCallback(async () => {
    return await syncManager.forceFullSync();
  }, []);

  return {
    ...syncStatus,
    triggerSync,
    forceFullSync,
    isSyncing: syncStatus.status === "syncing",
  };
}

export default useSync;
