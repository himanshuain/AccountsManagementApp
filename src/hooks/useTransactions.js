'use client';

import { useState, useEffect, useCallback } from 'react';
import { transactionDB, bulkOperations } from '@/lib/db';

export function useTransactions(supplierId = null) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      
      // First, get local data
      let data;
      if (supplierId) {
        data = await transactionDB.getBySupplier(supplierId);
      } else {
        data = await transactionDB.getAll();
      }
      setTransactions(data);
      setLoading(false); // Show local data immediately, don't wait for cloud
      
      // Then, try to fetch from cloud and merge (with timeout)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const response = await fetch('/api/transactions', { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const { data: cloudData } = await response.json();
          if (cloudData && cloudData.length > 0) {
            // Merge cloud data into local DB
            await bulkOperations.mergeTransactions(cloudData);
            // Re-fetch from local DB to get merged data
            if (supplierId) {
              data = await transactionDB.getBySupplier(supplierId);
            } else {
              data = await transactionDB.getAll();
            }
            setTransactions(data);
          }
        }
      } catch (cloudError) {
        console.warn('Cloud fetch failed, using local data:', cloudError.message);
      }
      
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
