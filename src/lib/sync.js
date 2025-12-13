import {
  syncQueueDB,
  bulkOperations,
  supplierDB,
  transactionDB,
  customerDB,
  udharDB,
  incomeDB,
  setOnDataChangeCallback,
} from "./db";

const API_BASE = "/api";
const SYNC_INTERVAL = 30000; // 30 seconds periodic sync
const DEBOUNCE_DELAY = 2000; // 2 seconds debounce for auto-sync after CRUD
const IDLE_TIMEOUT = 20000; // 20 seconds - stop syncing if idle

class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.listeners = new Set();
    this.syncTimer = null;
    this.debounceTimer = null;
    this.periodicSyncInterval = null;
    this.isPageVisible = true;
    this.lastActivityTime = Date.now();
    this.idleCheckInterval = null;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(status) {
    this.listeners.forEach((listener) => listener(status));
  }

  // Update last activity time
  updateActivity() {
    this.lastActivityTime = Date.now();
  }

  // Check if user is idle (no activity for IDLE_TIMEOUT)
  isUserIdle() {
    return Date.now() - this.lastActivityTime > IDLE_TIMEOUT;
  }

  // Start periodic background sync
  startPeriodicSync() {
    if (this.periodicSyncInterval) return;

    this.periodicSyncInterval = setInterval(() => {
      // Only sync if online, not already syncing, page is visible, and user is active
      if (
        navigator.onLine &&
        !this.isSyncing &&
        this.isPageVisible &&
        !this.isUserIdle()
      ) {
        console.log("Periodic sync triggered");
        this.sync();
      } else if (this.isUserIdle()) {
        console.log("Skipping periodic sync - user idle");
      }
    }, SYNC_INTERVAL);

    console.log("Periodic sync started (every 30s, pauses when idle)");
  }

  // Stop periodic sync
  stopPeriodicSync() {
    if (this.periodicSyncInterval) {
      clearInterval(this.periodicSyncInterval);
      this.periodicSyncInterval = null;
    }
  }

  // Handle visibility change
  handleVisibilityChange(isVisible) {
    this.isPageVisible = isVisible;
    if (isVisible) {
      // Reset activity when page becomes visible
      this.updateActivity();
      console.log("[Sync] Page visible - activity reset");
    } else {
      console.log("[Sync] Page hidden - syncing paused");
    }
  }

  // Debounced sync - called after CRUD operations
  debouncedSync() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      if (navigator.onLine && !this.isSyncing && this.isPageVisible) {
        console.log("Auto-sync after CRUD operation");
        this.sync();
      }
    }, DEBOUNCE_DELAY);
  }

  // Trigger sync immediately (for manual sync)
  triggerSync() {
    // Manual sync should always work, update activity
    this.updateActivity();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    return this.sync();
  }

  async sync() {
    console.log(
      "[Sync] Starting sync... Online:",
      navigator.onLine,
      "Already syncing:",
      this.isSyncing,
      "Visible:",
      this.isPageVisible,
    );

    if (this.isSyncing || !navigator.onLine) {
      console.log(
        "[Sync] Skipped - reason:",
        this.isSyncing ? "already_syncing" : "offline",
      );
      return {
        success: false,
        reason: this.isSyncing ? "already_syncing" : "offline",
      };
    }

    this.isSyncing = true;
    this.notify({ status: "syncing" });

    try {
      // Step 1: Push local changes to cloud
      console.log("[Sync] Step 1: Pushing changes...");
      const pushResult = await this.pushChanges();
      console.log("[Sync] Push result:", pushResult);

      // Step 2: Pull latest from cloud
      console.log("[Sync] Step 2: Pulling changes...");
      await this.pullChanges();

      // Step 3: Clear sync queue only if push was successful
      if (pushResult !== false) {
        console.log("[Sync] Step 3: Clearing queue...");
        await syncQueueDB.clear();
      }

      console.log("[Sync] Complete!");
      this.notify({ status: "synced", lastSync: new Date().toISOString() });
      return { success: true };
    } catch (error) {
      console.error("[Sync] Failed:", error);
      this.notify({ status: "error", error: error.message });
      return { success: false, error: error.message };
    } finally {
      this.isSyncing = false;
    }
  }

  async pushChanges() {
    const queue = await syncQueueDB.getAll();

    console.log("[Sync] Push changes - queue length:", queue.length);

    if (queue.length === 0) return true;

    let allSuccess = true;

    // Group by entity type
    const supplierOps = queue.filter((q) => q.entityType === "supplier");
    const transactionOps = queue.filter((q) => q.entityType === "transaction");
    const customerOps = queue.filter((q) => q.entityType === "customer");
    const udharOps = queue.filter((q) => q.entityType === "udhar");
    const incomeOps = queue.filter((q) => q.entityType === "income");

    console.log(
      "[Sync] Operations - Suppliers:",
      supplierOps.length,
      "Transactions:",
      transactionOps.length,
      "Customers:",
      customerOps.length,
      "Udhar:",
      udharOps.length,
      "Income:",
      incomeOps.length,
    );

    // Push supplier changes
    if (supplierOps.length > 0) {
      try {
        console.log("[Sync] Pushing suppliers...");
        const response = await fetch(`${API_BASE}/sync/suppliers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operations: supplierOps }),
        });

        const result = await response.json();
        console.log("[Sync] Suppliers response:", result);

        if (response.ok) {
          const supplierIds = supplierOps.map((op) => op.entityId);
          await bulkOperations.markAsSynced("supplier", supplierIds);
          console.log("[Sync] Marked suppliers as synced:", supplierIds);
        } else {
          console.error("[Sync] Failed to sync suppliers:", result);
          allSuccess = false;
        }
      } catch (error) {
        console.error("[Sync] Supplier sync error:", error);
        allSuccess = false;
      }
    }

    // Push transaction changes
    if (transactionOps.length > 0) {
      try {
        console.log("[Sync] Pushing transactions...");
        const response = await fetch(`${API_BASE}/sync/transactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operations: transactionOps }),
        });

        const result = await response.json();
        console.log("[Sync] Transactions response:", result);

        if (response.ok) {
          const transactionIds = transactionOps.map((op) => op.entityId);
          await bulkOperations.markAsSynced("transaction", transactionIds);
          console.log("[Sync] Marked transactions as synced:", transactionIds);
        } else {
          console.error("[Sync] Failed to sync transactions:", result);
          allSuccess = false;
        }
      } catch (error) {
        console.error("[Sync] Transaction sync error:", error);
        allSuccess = false;
      }
    }

    // Push customer changes
    if (customerOps.length > 0) {
      try {
        console.log("[Sync] Pushing customers...");
        const response = await fetch(`${API_BASE}/sync/customers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operations: customerOps }),
        });

        const result = await response.json();
        console.log("[Sync] Customers response:", result);

        if (response.ok) {
          const customerIds = customerOps.map((op) => op.entityId);
          await bulkOperations.markAsSynced("customer", customerIds);
          console.log("[Sync] Marked customers as synced:", customerIds);
        } else {
          console.error("[Sync] Failed to sync customers:", result);
          allSuccess = false;
        }
      } catch (error) {
        console.error("[Sync] Customer sync error:", error);
        allSuccess = false;
      }
    }

    // Push udhar changes
    if (udharOps.length > 0) {
      try {
        console.log("[Sync] Pushing udhar...");
        const response = await fetch(`${API_BASE}/sync/udhar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operations: udharOps }),
        });

        const result = await response.json();
        console.log("[Sync] Udhar response:", result);

        if (response.ok) {
          const udharIds = udharOps.map((op) => op.entityId);
          await bulkOperations.markAsSynced("udhar", udharIds);
          console.log("[Sync] Marked udhar as synced:", udharIds);
        } else {
          console.error("[Sync] Failed to sync udhar:", result);
          allSuccess = false;
        }
      } catch (error) {
        console.error("[Sync] Udhar sync error:", error);
        allSuccess = false;
      }
    }

    // Push income changes
    if (incomeOps.length > 0) {
      try {
        console.log("[Sync] Pushing income...");
        const response = await fetch(`${API_BASE}/sync/income`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operations: incomeOps }),
        });

        const result = await response.json();
        console.log("[Sync] Income response:", result);

        if (response.ok) {
          const incomeIds = incomeOps.map((op) => op.entityId);
          await bulkOperations.markAsSynced("income", incomeIds);
          console.log("[Sync] Marked income as synced:", incomeIds);
        } else {
          console.error("[Sync] Failed to sync income:", result);
          allSuccess = false;
        }
      } catch (error) {
        console.error("[Sync] Income sync error:", error);
        allSuccess = false;
      }
    }

    return allSuccess;
  }

  async pullChanges() {
    // Fetch latest suppliers
    try {
      console.log("[Sync] Pulling suppliers from cloud...");
      const suppliersResponse = await fetch(`${API_BASE}/suppliers`);
      if (suppliersResponse.ok) {
        const { data: suppliers } = await suppliersResponse.json();
        console.log(
          "[Sync] Got",
          suppliers?.length || 0,
          "suppliers from cloud",
        );
        if (suppliers && suppliers.length > 0) {
          await bulkOperations.mergeSuppliers(suppliers);
          const ids = suppliers.map((s) => s.id);
          await bulkOperations.markAsSynced("supplier", ids);
        }
      }
    } catch (error) {
      console.warn("[Sync] Failed to pull suppliers:", error.message);
    }

    // Fetch latest transactions
    try {
      console.log("[Sync] Pulling transactions from cloud...");
      const transactionsResponse = await fetch(`${API_BASE}/transactions`);
      if (transactionsResponse.ok) {
        const { data: transactions } = await transactionsResponse.json();
        console.log(
          "[Sync] Got",
          transactions?.length || 0,
          "transactions from cloud",
        );
        if (transactions && transactions.length > 0) {
          await bulkOperations.mergeTransactions(transactions);
          const ids = transactions.map((t) => t.id);
          await bulkOperations.markAsSynced("transaction", ids);
        }
      }
    } catch (error) {
      console.warn("[Sync] Failed to pull transactions:", error.message);
    }

    // Fetch latest customers
    try {
      console.log("[Sync] Pulling customers from cloud...");
      const customersResponse = await fetch(`${API_BASE}/customers`);
      if (customersResponse.ok) {
        const { data: customers } = await customersResponse.json();
        console.log(
          "[Sync] Got",
          customers?.length || 0,
          "customers from cloud",
        );
        if (customers && customers.length > 0) {
          await bulkOperations.mergeCustomers(customers);
          const ids = customers.map((c) => c.id);
          await bulkOperations.markAsSynced("customer", ids);
        }
      }
    } catch (error) {
      console.warn("[Sync] Failed to pull customers:", error.message);
    }

    // Fetch latest udhar
    try {
      console.log("[Sync] Pulling udhar from cloud...");
      const udharResponse = await fetch(`${API_BASE}/udhar`);
      if (udharResponse.ok) {
        const { data: udhar } = await udharResponse.json();
        console.log("[Sync] Got", udhar?.length || 0, "udhar from cloud");
        if (udhar && udhar.length > 0) {
          await bulkOperations.mergeUdhar(udhar);
          const ids = udhar.map((u) => u.id);
          await bulkOperations.markAsSynced("udhar", ids);
        }
      }
    } catch (error) {
      console.warn("[Sync] Failed to pull udhar:", error.message);
    }

    // Fetch latest income
    try {
      console.log("[Sync] Pulling income from cloud...");
      const incomeResponse = await fetch(`${API_BASE}/income`);
      if (incomeResponse.ok) {
        const { data: income } = await incomeResponse.json();
        console.log("[Sync] Got", income?.length || 0, "income from cloud");
        if (income && income.length > 0) {
          await bulkOperations.mergeIncome(income);
          const ids = income.map((i) => i.id);
          await bulkOperations.markAsSynced("income", ids);
        }
      }
    } catch (error) {
      console.warn("[Sync] Failed to pull income:", error.message);
    }
  }

  async getPendingCount() {
    return await syncQueueDB.getPendingCount();
  }

  async forceFullSync() {
    if (!navigator.onLine) {
      return { success: false, reason: "offline" };
    }

    // Manual sync - update activity
    this.updateActivity();

    this.isSyncing = true;
    this.notify({ status: "syncing" });

    try {
      // Get all local data
      const localSuppliers = await supplierDB.getAll();
      const localTransactions = await transactionDB.getAll();
      const localCustomers = await customerDB.getAll();
      const localUdhar = await udharDB.getAll();
      const localIncome = await incomeDB.getAll();

      // Push all local data
      await fetch(`${API_BASE}/sync/full`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suppliers: localSuppliers,
          transactions: localTransactions,
          customers: localCustomers,
          udhar: localUdhar,
          income: localIncome,
        }),
      });

      // Pull and replace
      await this.pullChanges();

      // Clear sync queue
      await syncQueueDB.clear();

      this.notify({ status: "synced", lastSync: new Date().toISOString() });
      return { success: true };
    } catch (error) {
      console.error("Full sync failed:", error);
      this.notify({ status: "error", error: error.message });
      return { success: false, error: error.message };
    } finally {
      this.isSyncing = false;
    }
  }
}

// Create singleton instance
export const syncManager = new SyncManager();

// Initialize sync manager in browser
if (typeof window !== "undefined") {
  // Set up callback for auto-sync after CRUD operations
  setOnDataChangeCallback(() => {
    console.log("[Sync] Data changed, triggering debounced sync...");
    syncManager.updateActivity(); // User did something
    syncManager.debouncedSync();
  });

  // Track user activity
  const activityEvents = ["mousedown", "keydown", "touchstart", "scroll"];
  activityEvents.forEach((event) => {
    document.addEventListener(
      event,
      () => {
        syncManager.updateActivity();
      },
      { passive: true },
    );
  });

  // Handle page visibility changes
  document.addEventListener("visibilitychange", () => {
    syncManager.handleVisibilityChange(!document.hidden);
  });

  // Auto-sync when coming online (only if page is visible and user active)
  window.addEventListener("online", () => {
    if (!syncManager.isUserIdle() && !document.hidden) {
      console.log("[Sync] Back online, triggering sync...");
      syncManager.sync();
    }
  });

  // Stop periodic sync when going offline
  window.addEventListener("offline", () => {
    console.log("[Sync] Gone offline, pausing periodic sync");
  });

  // Start periodic sync after page loads
  const initSync = () => {
    console.log("[Sync] Initializing sync manager...");
    syncManager.startPeriodicSync();
    // Trigger initial sync
    setTimeout(() => {
      console.log("[Sync] Triggering initial sync...");
      syncManager.sync();
    }, 1000);
  };

  if (document.readyState === "complete") {
    initSync();
  } else {
    window.addEventListener("load", initSync);
  }

  // Expose for debugging
  window.__syncManager = syncManager;
  console.log(
    "[Sync] Debug: use window.__syncManager.sync() to trigger sync manually",
  );
}

export default syncManager;
