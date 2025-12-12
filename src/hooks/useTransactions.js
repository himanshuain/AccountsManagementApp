'use client';

import { useState, useEffect, useCallback } from 'react';
import { transactionDB } from '@/lib/db';

export function useTransactions(supplierId = null) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      let data;
      if (supplierId) {
        data = await transactionDB.getBySupplier(supplierId);
      } else {
        data = await transactionDB.getAll();
      }
      setTransactions(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const addTransaction = useCallback(async (transactionData) => {
    try {
      const newTransaction = await transactionDB.add(transactionData);
      setTransactions(prev => [newTransaction, ...prev]);
      return { success: true, data: newTransaction };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const updateTransaction = useCallback(async (id, updates) => {
    try {
      const updated = await transactionDB.update(id, updates);
      setTransactions(prev => prev.map(t => t.id === id ? updated : t));
      return { success: true, data: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const deleteTransaction = useCallback(async (id) => {
    try {
      await transactionDB.delete(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const getPendingPayments = useCallback(async () => {
    return await transactionDB.getPendingPayments();
  }, []);

  const getRecentTransactions = useCallback(async (limit = 10) => {
    return await transactionDB.getRecent(limit);
  }, []);

  return {
    transactions,
    loading,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getPendingPayments,
    getRecentTransactions,
    refresh: fetchTransactions
  };
}

export default useTransactions;

