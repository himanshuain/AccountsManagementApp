import Dexie from 'dexie';

// Initialize Dexie database
export const db = new Dexie('ClothesShopManager');

// Define database schema
db.version(1).stores({
  suppliers: '++id, name, companyName, phone, email, gstNumber, syncStatus, updatedAt',
  transactions: '++id, supplierId, date, paymentStatus, syncStatus, updatedAt',
  pendingUploads: '++id, type, entityId, filePath, createdAt',
  syncQueue: '++id, operation, entityType, entityId, data, createdAt',
  appSettings: 'key'
});

// Callback for triggering sync after CRUD operations
let onDataChange = null;

export function setOnDataChangeCallback(callback) {
  onDataChange = callback;
}

// Trigger sync after data changes
function notifyDataChange() {
  if (onDataChange) {
    onDataChange();
  }
}

// Helper function to generate UUID
export function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

// Supplier operations
export const supplierDB = {
  async getAll() {
    return await db.suppliers.toArray();
  },

  async getById(id) {
    return await db.suppliers.get(id);
  },

  async add(supplier) {
    const now = new Date().toISOString();
    const newSupplier = {
      ...supplier,
      id: supplier.id || generateId(),
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending'
    };
    await db.suppliers.add(newSupplier);
    
    // Add to sync queue
    await db.syncQueue.add({
      operation: 'create',
      entityType: 'supplier',
      entityId: newSupplier.id,
      data: newSupplier,
      createdAt: now
    });
    
    // Trigger auto-sync
    notifyDataChange();
    
    return newSupplier;
  },

  async update(id, updates) {
    const now = new Date().toISOString();
    const updatedData = {
      ...updates,
      updatedAt: now,
      syncStatus: 'pending'
    };
    await db.suppliers.update(id, updatedData);
    
    const supplier = await db.suppliers.get(id);
    
    // Add to sync queue
    await db.syncQueue.add({
      operation: 'update',
      entityType: 'supplier',
      entityId: id,
      data: supplier,
      createdAt: now
    });
    
    // Trigger auto-sync
    notifyDataChange();
    
    return supplier;
  },

  async delete(id) {
    const now = new Date().toISOString();
    
    // Add to sync queue before deleting
    await db.syncQueue.add({
      operation: 'delete',
      entityType: 'supplier',
      entityId: id,
      data: { id },
      createdAt: now
    });
    
    await db.suppliers.delete(id);
    
    // Also delete related transactions
    await db.transactions.where('supplierId').equals(id).delete();
    
    // Trigger auto-sync
    notifyDataChange();
  },

  async search(query) {
    const lowerQuery = query.toLowerCase();
    return await db.suppliers
      .filter(s => 
        s.name?.toLowerCase().includes(lowerQuery) ||
        s.companyName?.toLowerCase().includes(lowerQuery) ||
        s.phone?.includes(query)
      )
      .toArray();
  }
};

// Transaction operations
export const transactionDB = {
  async getAll() {
    return await db.transactions.toArray();
  },

  async getBySupplier(supplierId) {
    return await db.transactions
      .where('supplierId')
      .equals(supplierId)
      .reverse()
      .sortBy('date');
  },

  async getById(id) {
    return await db.transactions.get(id);
  },

  async add(transaction) {
    const now = new Date().toISOString();
    const newTransaction = {
      ...transaction,
      id: transaction.id || generateId(),
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending'
    };
    await db.transactions.add(newTransaction);
    
    // Add to sync queue
    await db.syncQueue.add({
      operation: 'create',
      entityType: 'transaction',
      entityId: newTransaction.id,
      data: newTransaction,
      createdAt: now
    });
    
    // Trigger auto-sync
    notifyDataChange();
    
    return newTransaction;
  },

  async update(id, updates) {
    const now = new Date().toISOString();
    const updatedData = {
      ...updates,
      updatedAt: now,
      syncStatus: 'pending'
    };
    await db.transactions.update(id, updatedData);
    
    const transaction = await db.transactions.get(id);
    
    // Add to sync queue
    await db.syncQueue.add({
      operation: 'update',
      entityType: 'transaction',
      entityId: id,
      data: transaction,
      createdAt: now
    });
    
    // Trigger auto-sync
    notifyDataChange();
    
    return transaction;
  },

  async delete(id) {
    const now = new Date().toISOString();
    
    // Add to sync queue before deleting
    await db.syncQueue.add({
      operation: 'delete',
      entityType: 'transaction',
      entityId: id,
      data: { id },
      createdAt: now
    });
    
    await db.transactions.delete(id);
    
    // Trigger auto-sync
    notifyDataChange();
  },

  async getPendingPayments() {
    return await db.transactions
      .where('paymentStatus')
      .anyOf(['pending', 'partial'])
      .toArray();
  },

  async getRecent(limit = 10) {
    return await db.transactions
      .orderBy('updatedAt')
      .reverse()
      .limit(limit)
      .toArray();
  }
};

// Sync queue operations
export const syncQueueDB = {
  async getAll() {
    return await db.syncQueue.orderBy('createdAt').toArray();
  },

  async clear() {
    return await db.syncQueue.clear();
  },

  async remove(id) {
    return await db.syncQueue.delete(id);
  },

  async getPendingCount() {
    return await db.syncQueue.count();
  }
};

// Pending uploads (for images when offline)
export const pendingUploadsDB = {
  async add(upload) {
    return await db.pendingUploads.add({
      ...upload,
      createdAt: new Date().toISOString()
    });
  },

  async getAll() {
    return await db.pendingUploads.toArray();
  },

  async remove(id) {
    return await db.pendingUploads.delete(id);
  }
};

// App settings
export const settingsDB = {
  async get(key) {
    const setting = await db.appSettings.get(key);
    return setting?.value;
  },

  async set(key, value) {
    return await db.appSettings.put({ key, value });
  }
};

// Bulk operations for sync
export const bulkOperations = {
  async replaceSuppliers(suppliers) {
    await db.transaction('rw', db.suppliers, async () => {
      await db.suppliers.clear();
      await db.suppliers.bulkAdd(suppliers.map(s => ({ ...s, syncStatus: 'synced' })));
    });
  },

  async replaceTransactions(transactions) {
    await db.transaction('rw', db.transactions, async () => {
      await db.transactions.clear();
      await db.transactions.bulkAdd(transactions.map(t => ({ ...t, syncStatus: 'synced' })));
    });
  },

  async mergeSuppliers(cloudSuppliers) {
    await db.transaction('rw', db.suppliers, async () => {
      for (const cloudSupplier of cloudSuppliers) {
        const local = await db.suppliers.get(cloudSupplier.id);
        if (!local) {
          await db.suppliers.add({ ...cloudSupplier, syncStatus: 'synced' });
        } else if (new Date(cloudSupplier.updatedAt) > new Date(local.updatedAt)) {
          await db.suppliers.put({ ...cloudSupplier, syncStatus: 'synced' });
        }
      }
    });
  },

  async mergeTransactions(cloudTransactions) {
    await db.transaction('rw', db.transactions, async () => {
      for (const cloudTx of cloudTransactions) {
        const local = await db.transactions.get(cloudTx.id);
        if (!local) {
          await db.transactions.add({ ...cloudTx, syncStatus: 'synced' });
        } else if (new Date(cloudTx.updatedAt) > new Date(local.updatedAt)) {
          await db.transactions.put({ ...cloudTx, syncStatus: 'synced' });
        }
      }
    });
  },

  async markAsSynced(entityType, ids) {
    const table = entityType === 'supplier' ? db.suppliers : db.transactions;
    await db.transaction('rw', table, async () => {
      for (const id of ids) {
        await table.update(id, { syncStatus: 'synced' });
      }
    });
  }
};

export default db;

