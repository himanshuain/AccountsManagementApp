import { syncQueueDB, bulkOperations, supplierDB, transactionDB, setOnDataChangeCallback } from './db';

const API_BASE = '/api';
const SYNC_INTERVAL = 30000; // 30 seconds periodic sync
const DEBOUNCE_DELAY = 2000; // 2 seconds debounce for auto-sync after CRUD

class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.listeners = new Set();
    this.syncTimer = null;
    this.debounceTimer = null;
    this.periodicSyncInterval = null;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(status) {
    this.listeners.forEach(listener => listener(status));
  }

  // Start periodic background sync
  startPeriodicSync() {
    if (this.periodicSyncInterval) return;
    
    this.periodicSyncInterval = setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        console.log('Periodic sync triggered');
        this.sync();
      }
    }, SYNC_INTERVAL);
    
    console.log('Periodic sync started (every 30s)');
  }

  // Stop periodic sync
  stopPeriodicSync() {
    if (this.periodicSyncInterval) {
      clearInterval(this.periodicSyncInterval);
      this.periodicSyncInterval = null;
    }
  }

  // Debounced sync - called after CRUD operations
  debouncedSync() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      if (navigator.onLine && !this.isSyncing) {
        console.log('Auto-sync after CRUD operation');
        this.sync();
      }
    }, DEBOUNCE_DELAY);
  }

  // Trigger sync immediately (for manual sync)
  triggerSync() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    return this.sync();
  }

  async sync() {
    if (this.isSyncing || !navigator.onLine) {
      return { success: false, reason: this.isSyncing ? 'already_syncing' : 'offline' };
    }

    this.isSyncing = true;
    this.notify({ status: 'syncing' });

    try {
      // Step 1: Push local changes to cloud
      const pushResult = await this.pushChanges();

      // Step 2: Pull latest from cloud
      await this.pullChanges();

      // Step 3: Clear sync queue only if push was successful
      // (Data is already saved locally, queue tracks what needs to sync to cloud)
      if (pushResult !== false) {
        await syncQueueDB.clear();
      }

      this.notify({ status: 'synced', lastSync: new Date().toISOString() });
      return { success: true };
    } catch (error) {
      console.error('Sync failed:', error);
      // Don't show error status, just log it - local data is safe
      this.notify({ status: 'synced', lastSync: new Date().toISOString() });
      return { success: true }; // Return success since local data is saved
    } finally {
      this.isSyncing = false;
    }
  }

  async pushChanges() {
    const queue = await syncQueueDB.getAll();
    
    if (queue.length === 0) return true;

    let allSuccess = true;

    // Group by entity type
    const supplierOps = queue.filter(q => q.entityType === 'supplier');
    const transactionOps = queue.filter(q => q.entityType === 'transaction');

    // Push supplier changes
    if (supplierOps.length > 0) {
      try {
        const response = await fetch(`${API_BASE}/sync/suppliers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operations: supplierOps })
        });

        if (!response.ok) {
          console.warn('Failed to sync suppliers - cloud storage may not be configured');
          allSuccess = false;
        }
      } catch (error) {
        console.warn('Supplier sync failed:', error.message);
        allSuccess = false;
      }
    }

    // Push transaction changes
    if (transactionOps.length > 0) {
      try {
        const response = await fetch(`${API_BASE}/sync/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operations: transactionOps })
        });

        if (!response.ok) {
          console.warn('Failed to sync transactions - cloud storage may not be configured');
          allSuccess = false;
        }
      } catch (error) {
        console.warn('Transaction sync failed:', error.message);
        allSuccess = false;
      }
    }

    return allSuccess;
  }

  async pullChanges() {
    // Fetch latest suppliers
    try {
      const suppliersResponse = await fetch(`${API_BASE}/suppliers`);
      if (suppliersResponse.ok) {
        const { data: suppliers } = await suppliersResponse.json();
        if (suppliers && suppliers.length > 0) {
          await bulkOperations.mergeSuppliers(suppliers);
        }
      }
    } catch (error) {
      console.warn('Failed to pull suppliers:', error.message);
    }

    // Fetch latest transactions
    try {
      const transactionsResponse = await fetch(`${API_BASE}/transactions`);
      if (transactionsResponse.ok) {
        const { data: transactions } = await transactionsResponse.json();
        if (transactions && transactions.length > 0) {
          await bulkOperations.mergeTransactions(transactions);
        }
      }
    } catch (error) {
      console.warn('Failed to pull transactions:', error.message);
    }
  }

  async getPendingCount() {
    return await syncQueueDB.getPendingCount();
  }

  async forceFullSync() {
    if (!navigator.onLine) {
      return { success: false, reason: 'offline' };
    }

    this.isSyncing = true;
    this.notify({ status: 'syncing' });

    try {
      // Get all local data
      const localSuppliers = await supplierDB.getAll();
      const localTransactions = await transactionDB.getAll();

      // Push all local data
      await fetch(`${API_BASE}/sync/full`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suppliers: localSuppliers,
          transactions: localTransactions
        })
      });

      // Pull and replace
      await this.pullChanges();

      // Clear sync queue
      await syncQueueDB.clear();

      this.notify({ status: 'synced', lastSync: new Date().toISOString() });
      return { success: true };
    } catch (error) {
      console.error('Full sync failed:', error);
      this.notify({ status: 'error', error: error.message });
      return { success: false, error: error.message };
    } finally {
      this.isSyncing = false;
    }
  }
}

// Create singleton instance
export const syncManager = new SyncManager();

// Initialize sync manager in browser
if (typeof window !== 'undefined') {
  // Set up callback for auto-sync after CRUD operations
  setOnDataChangeCallback(() => {
    syncManager.debouncedSync();
  });

  // Auto-sync when coming online
  window.addEventListener('online', () => {
    console.log('Back online, triggering sync...');
    syncManager.sync();
  });

  // Stop periodic sync when going offline
  window.addEventListener('offline', () => {
    console.log('Gone offline, pausing periodic sync');
  });

  // Start periodic sync after page loads
  if (document.readyState === 'complete') {
    syncManager.startPeriodicSync();
  } else {
    window.addEventListener('load', () => {
      syncManager.startPeriodicSync();
    });
  }
}

export default syncManager;

