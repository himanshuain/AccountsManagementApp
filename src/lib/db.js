import Dexie from "dexie";

// Initialize Dexie database
export const db = new Dexie("ClothesShopManager");

// Define database schema - Version 3 adds payments array to udhar
db.version(3).stores({
  suppliers:
    "++id, name, companyName, phone, email, gstNumber, syncStatus, updatedAt",
  transactions: "++id, supplierId, date, paymentStatus, syncStatus, updatedAt",
  customers: "++id, name, phone, address, syncStatus, updatedAt, totalPending",
  udhar:
    "++id, customerId, date, paymentStatus, syncStatus, updatedAt, amount",
  income: "++id, date, type, syncStatus, updatedAt",
  pendingUploads: "++id, type, entityId, filePath, createdAt",
  syncQueue: "++id, operation, entityType, entityId, data, createdAt",
  appSettings: "key",
});

// Version 2 - adds customers, udhar, and income
db.version(2).stores({
  suppliers:
    "++id, name, companyName, phone, email, gstNumber, syncStatus, updatedAt",
  transactions: "++id, supplierId, date, paymentStatus, syncStatus, updatedAt",
  customers: "++id, name, phone, address, syncStatus, updatedAt, totalPending",
  udhar:
    "++id, customerId, date, paymentStatus, syncStatus, updatedAt, cashAmount, onlineAmount",
  income: "++id, date, type, syncStatus, updatedAt",
  pendingUploads: "++id, type, entityId, filePath, createdAt",
  syncQueue: "++id, operation, entityType, entityId, data, createdAt",
  appSettings: "key",
});

// Version 1 - original schema
db.version(1).stores({
  suppliers:
    "++id, name, companyName, phone, email, gstNumber, syncStatus, updatedAt",
  transactions: "++id, supplierId, date, paymentStatus, syncStatus, updatedAt",
  pendingUploads: "++id, type, entityId, filePath, createdAt",
  syncQueue: "++id, operation, entityType, entityId, data, createdAt",
  appSettings: "key",
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
  return crypto.randomUUID
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
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
      syncStatus: "pending",
    };
    await db.suppliers.add(newSupplier);

    // Add to sync queue
    await db.syncQueue.add({
      operation: "create",
      entityType: "supplier",
      entityId: newSupplier.id,
      data: newSupplier,
      createdAt: now,
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
      syncStatus: "pending",
    };
    await db.suppliers.update(id, updatedData);

    const supplier = await db.suppliers.get(id);

    // Add to sync queue
    await db.syncQueue.add({
      operation: "update",
      entityType: "supplier",
      entityId: id,
      data: supplier,
      createdAt: now,
    });

    // Trigger auto-sync
    notifyDataChange();

    return supplier;
  },

  async delete(id) {
    const now = new Date().toISOString();

    // Add to sync queue before deleting
    await db.syncQueue.add({
      operation: "delete",
      entityType: "supplier",
      entityId: id,
      data: { id },
      createdAt: now,
    });

    await db.suppliers.delete(id);

    // Also delete related transactions
    await db.transactions.where("supplierId").equals(id).delete();

    // Trigger auto-sync
    notifyDataChange();
  },

  async search(query) {
    const lowerQuery = query.toLowerCase();
    return await db.suppliers
      .filter(
        (s) =>
          s.name?.toLowerCase().includes(lowerQuery) ||
          s.companyName?.toLowerCase().includes(lowerQuery) ||
          s.phone?.includes(query),
      )
      .toArray();
  },
};

// Transaction operations
export const transactionDB = {
  async getAll() {
    return await db.transactions.toArray();
  },

  async getBySupplier(supplierId) {
    return await db.transactions
      .where("supplierId")
      .equals(supplierId)
      .reverse()
      .sortBy("date");
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
      syncStatus: "pending",
    };
    await db.transactions.add(newTransaction);

    // Add to sync queue
    await db.syncQueue.add({
      operation: "create",
      entityType: "transaction",
      entityId: newTransaction.id,
      data: newTransaction,
      createdAt: now,
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
      syncStatus: "pending",
    };
    await db.transactions.update(id, updatedData);

    const transaction = await db.transactions.get(id);

    // Add to sync queue
    await db.syncQueue.add({
      operation: "update",
      entityType: "transaction",
      entityId: id,
      data: transaction,
      createdAt: now,
    });

    // Trigger auto-sync
    notifyDataChange();

    return transaction;
  },

  async delete(id) {
    const now = new Date().toISOString();

    // Add to sync queue before deleting
    await db.syncQueue.add({
      operation: "delete",
      entityType: "transaction",
      entityId: id,
      data: { id },
      createdAt: now,
    });

    await db.transactions.delete(id);

    // Trigger auto-sync
    notifyDataChange();
  },

  async getPendingPayments() {
    return await db.transactions
      .where("paymentStatus")
      .anyOf(["pending", "partial"])
      .toArray();
  },

  async getRecent(limit = 10) {
    return await db.transactions
      .orderBy("updatedAt")
      .reverse()
      .limit(limit)
      .toArray();
  },
};

// Customer operations (for Udhar/Lending)
export const customerDB = {
  async getAll() {
    return await db.customers.toArray();
  },

  async getById(id) {
    return await db.customers.get(id);
  },

  async add(customer) {
    const now = new Date().toISOString();
    const newCustomer = {
      ...customer,
      id: customer.id || generateId(),
      createdAt: now,
      updatedAt: now,
      syncStatus: "pending",
      totalPending: 0,
    };
    await db.customers.add(newCustomer);

    // Add to sync queue
    await db.syncQueue.add({
      operation: "create",
      entityType: "customer",
      entityId: newCustomer.id,
      data: newCustomer,
      createdAt: now,
    });

    notifyDataChange();
    return newCustomer;
  },

  async update(id, updates) {
    const now = new Date().toISOString();
    const updatedData = {
      ...updates,
      updatedAt: now,
      syncStatus: "pending",
    };
    await db.customers.update(id, updatedData);

    const customer = await db.customers.get(id);

    await db.syncQueue.add({
      operation: "update",
      entityType: "customer",
      entityId: id,
      data: customer,
      createdAt: now,
    });

    notifyDataChange();
    return customer;
  },

  async delete(id) {
    const now = new Date().toISOString();

    await db.syncQueue.add({
      operation: "delete",
      entityType: "customer",
      entityId: id,
      data: { id },
      createdAt: now,
    });

    await db.customers.delete(id);
    // Also delete related udhar records
    await db.udhar.where("customerId").equals(id).delete();

    notifyDataChange();
  },

  async search(query) {
    const lowerQuery = query.toLowerCase();
    return await db.customers
      .filter(
        (c) =>
          c.name?.toLowerCase().includes(lowerQuery) ||
          c.phone?.includes(query),
      )
      .toArray();
  },

  async updateTotalPending(customerId) {
    const udharRecords = await db.udhar
      .where("customerId")
      .equals(customerId)
      .toArray();

    const totalPending = udharRecords
      .filter((u) => u.paymentStatus !== "paid")
      .reduce((sum, u) => {
        // Support both old (cashAmount + onlineAmount) and new (amount) formats
        const total = u.amount || (u.cashAmount || 0) + (u.onlineAmount || 0);
        const paid = u.paidAmount || (u.paidCash || 0) + (u.paidOnline || 0);
        return sum + Math.max(0, total - paid);
      }, 0);

    await db.customers.update(customerId, {
      totalPending,
      updatedAt: new Date().toISOString(),
    });
  },
};

// Udhar (Lending) operations
export const udharDB = {
  async getAll() {
    return await db.udhar.toArray();
  },

  async getByCustomer(customerId) {
    return await db.udhar
      .where("customerId")
      .equals(customerId)
      .reverse()
      .sortBy("date");
  },

  async getById(id) {
    return await db.udhar.get(id);
  },

  async add(udhar) {
    const now = new Date().toISOString();
    const newUdhar = {
      ...udhar,
      id: udhar.id || generateId(),
      createdAt: now,
      updatedAt: now,
      syncStatus: "pending",
      paymentStatus: "pending",
    };
    await db.udhar.add(newUdhar);

    // Update customer's total pending
    await customerDB.updateTotalPending(newUdhar.customerId);

    await db.syncQueue.add({
      operation: "create",
      entityType: "udhar",
      entityId: newUdhar.id,
      data: newUdhar,
      createdAt: now,
    });

    notifyDataChange();
    return newUdhar;
  },

  async update(id, updates) {
    const now = new Date().toISOString();
    const updatedData = {
      ...updates,
      updatedAt: now,
      syncStatus: "pending",
    };
    await db.udhar.update(id, updatedData);

    const udhar = await db.udhar.get(id);

    // Update customer's total pending
    await customerDB.updateTotalPending(udhar.customerId);

    await db.syncQueue.add({
      operation: "update",
      entityType: "udhar",
      entityId: id,
      data: udhar,
      createdAt: now,
    });

    notifyDataChange();
    return udhar;
  },

  async delete(id) {
    const now = new Date().toISOString();
    const udhar = await db.udhar.get(id);

    await db.syncQueue.add({
      operation: "delete",
      entityType: "udhar",
      entityId: id,
      data: { id },
      createdAt: now,
    });

    await db.udhar.delete(id);

    // Update customer's total pending
    if (udhar?.customerId) {
      await customerDB.updateTotalPending(udhar.customerId);
    }

    notifyDataChange();
  },

  async getPending() {
    return await db.udhar.where("paymentStatus").equals("pending").toArray();
  },

  async getRecent(limit = 10) {
    return await db.udhar.orderBy("updatedAt").reverse().limit(limit).toArray();
  },

  // Record a deposit payment
  async recordDeposit(id, depositAmount, receiptUrl = null) {
    const udhar = await db.udhar.get(id);
    if (!udhar) return null;

    const now = new Date().toISOString();
    // Support both old and new format
    const totalAmount = udhar.amount || (udhar.cashAmount || 0) + (udhar.onlineAmount || 0);
    const currentPaid = udhar.paidAmount || (udhar.paidCash || 0) + (udhar.paidOnline || 0);
    const newPaidAmount = currentPaid + depositAmount;

    // Add to payments array (timeline)
    const newPayment = {
      id: generateId(),
      amount: depositAmount,
      date: now,
      receiptUrl: receiptUrl,
    };

    const updates = {
      payments: [...(udhar.payments || []), newPayment],
      paidAmount: newPaidAmount,
      // Keep backward compatibility
      paidCash: (udhar.paidCash || 0) + depositAmount,
      paymentStatus: newPaidAmount >= totalAmount ? "paid" : "partial",
    };

    return await this.update(id, updates);
  },

  // Mark as fully paid
  async markFullPaid(id, receiptUrl = null) {
    const udhar = await db.udhar.get(id);
    if (!udhar) return null;

    const now = new Date().toISOString();
    // Support both old and new format
    const totalAmount = udhar.amount || (udhar.cashAmount || 0) + (udhar.onlineAmount || 0);
    const currentPaid = udhar.paidAmount || (udhar.paidCash || 0) + (udhar.paidOnline || 0);
    const remainingAmount = totalAmount - currentPaid;

    // Add final payment to timeline if there's remaining amount
    const payments = [...(udhar.payments || [])];
    if (remainingAmount > 0) {
      payments.push({
        id: generateId(),
        amount: remainingAmount,
        date: now,
        receiptUrl: receiptUrl,
        isFinalPayment: true,
      });
    }

    return await this.update(id, {
      paymentStatus: "paid",
      paidAmount: totalAmount,
      paidCash: totalAmount, // backward compatibility
      paidDate: now,
      payments: payments,
    });
  },
};

// Income operations
export const incomeDB = {
  async getAll() {
    return await db.income.toArray();
  },

  async getById(id) {
    return await db.income.get(id);
  },

  async add(income) {
    const now = new Date().toISOString();
    const newIncome = {
      ...income,
      id: income.id || generateId(),
      createdAt: now,
      updatedAt: now,
      syncStatus: "pending",
    };
    await db.income.add(newIncome);

    await db.syncQueue.add({
      operation: "create",
      entityType: "income",
      entityId: newIncome.id,
      data: newIncome,
      createdAt: now,
    });

    notifyDataChange();
    return newIncome;
  },

  async update(id, updates) {
    const now = new Date().toISOString();
    const updatedData = {
      ...updates,
      updatedAt: now,
      syncStatus: "pending",
    };
    await db.income.update(id, updatedData);

    const income = await db.income.get(id);

    await db.syncQueue.add({
      operation: "update",
      entityType: "income",
      entityId: id,
      data: income,
      createdAt: now,
    });

    notifyDataChange();
    return income;
  },

  async delete(id) {
    const now = new Date().toISOString();

    await db.syncQueue.add({
      operation: "delete",
      entityType: "income",
      entityId: id,
      data: { id },
      createdAt: now,
    });

    await db.income.delete(id);
    notifyDataChange();
  },

  async getByDateRange(startDate, endDate) {
    return await db.income
      .filter((i) => {
        const date = new Date(i.date);
        return date >= new Date(startDate) && date <= new Date(endDate);
      })
      .toArray();
  },

  async getByType(type) {
    return await db.income.where("type").equals(type).toArray();
  },
};

// Sync queue operations
export const syncQueueDB = {
  async getAll() {
    return await db.syncQueue.orderBy("createdAt").toArray();
  },

  async clear() {
    return await db.syncQueue.clear();
  },

  async remove(id) {
    return await db.syncQueue.delete(id);
  },

  async getPendingCount() {
    return await db.syncQueue.count();
  },
};

// Pending uploads (for images when offline)
export const pendingUploadsDB = {
  async add(upload) {
    return await db.pendingUploads.add({
      ...upload,
      createdAt: new Date().toISOString(),
    });
  },

  async getAll() {
    return await db.pendingUploads.toArray();
  },

  async remove(id) {
    return await db.pendingUploads.delete(id);
  },
};

// App settings
export const settingsDB = {
  async get(key) {
    const setting = await db.appSettings.get(key);
    return setting?.value;
  },

  async set(key, value) {
    return await db.appSettings.put({ key, value });
  },
};

// Bulk operations for sync
export const bulkOperations = {
  async replaceSuppliers(suppliers) {
    await db.transaction("rw", db.suppliers, async () => {
      await db.suppliers.clear();
      await db.suppliers.bulkAdd(
        suppliers.map((s) => ({ ...s, syncStatus: "synced" })),
      );
    });
  },

  async replaceTransactions(transactions) {
    await db.transaction("rw", db.transactions, async () => {
      await db.transactions.clear();
      await db.transactions.bulkAdd(
        transactions.map((t) => ({ ...t, syncStatus: "synced" })),
      );
    });
  },

  async mergeSuppliers(cloudSuppliers) {
    await db.transaction("rw", db.suppliers, async () => {
      for (const cloudSupplier of cloudSuppliers) {
        const local = await db.suppliers.get(cloudSupplier.id);
        if (!local) {
          await db.suppliers.add({ ...cloudSupplier, syncStatus: "synced" });
        } else if (
          new Date(cloudSupplier.updatedAt) > new Date(local.updatedAt)
        ) {
          await db.suppliers.put({ ...cloudSupplier, syncStatus: "synced" });
        }
      }
    });
  },

  async mergeTransactions(cloudTransactions) {
    await db.transaction("rw", db.transactions, async () => {
      for (const cloudTx of cloudTransactions) {
        const local = await db.transactions.get(cloudTx.id);
        if (!local) {
          await db.transactions.add({ ...cloudTx, syncStatus: "synced" });
        } else if (new Date(cloudTx.updatedAt) > new Date(local.updatedAt)) {
          await db.transactions.put({ ...cloudTx, syncStatus: "synced" });
        }
      }
    });
  },

  async mergeCustomers(cloudCustomers) {
    await db.transaction("rw", db.customers, async () => {
      for (const cloudCustomer of cloudCustomers) {
        const local = await db.customers.get(cloudCustomer.id);
        if (!local) {
          await db.customers.add({ ...cloudCustomer, syncStatus: "synced" });
        } else if (
          new Date(cloudCustomer.updatedAt) > new Date(local.updatedAt)
        ) {
          await db.customers.put({ ...cloudCustomer, syncStatus: "synced" });
        }
      }
    });
  },

  async mergeUdhar(cloudUdhar) {
    await db.transaction("rw", db.udhar, async () => {
      for (const cloudU of cloudUdhar) {
        const local = await db.udhar.get(cloudU.id);
        if (!local) {
          await db.udhar.add({ ...cloudU, syncStatus: "synced" });
        } else if (new Date(cloudU.updatedAt) > new Date(local.updatedAt)) {
          await db.udhar.put({ ...cloudU, syncStatus: "synced" });
        }
      }
    });
  },

  async mergeIncome(cloudIncome) {
    await db.transaction("rw", db.income, async () => {
      for (const cloudI of cloudIncome) {
        const local = await db.income.get(cloudI.id);
        if (!local) {
          await db.income.add({ ...cloudI, syncStatus: "synced" });
        } else if (new Date(cloudI.updatedAt) > new Date(local.updatedAt)) {
          await db.income.put({ ...cloudI, syncStatus: "synced" });
        }
      }
    });
  },

  async markAsSynced(entityType, ids) {
    const tableMap = {
      supplier: db.suppliers,
      transaction: db.transactions,
      customer: db.customers,
      udhar: db.udhar,
      income: db.income,
    };
    const table = tableMap[entityType];
    if (!table) return;

    await db.transaction("rw", table, async () => {
      for (const id of ids) {
        await table.update(id, { syncStatus: "synced" });
      }
    });
  },
};

export default db;
