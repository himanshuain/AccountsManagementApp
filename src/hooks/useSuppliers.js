'use client';

import { useState, useEffect, useCallback } from 'react';
import { supplierDB, bulkOperations } from '@/lib/db';

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      
      // First, get local data
      let data = await supplierDB.getAll();
      setSuppliers(data);
      
      // Then, try to fetch from cloud and merge
      try {
        const response = await fetch('/api/suppliers');
        if (response.ok) {
          const { data: cloudData } = await response.json();
          if (cloudData && cloudData.length > 0) {
            // Merge cloud data into local DB
            await bulkOperations.mergeSuppliers(cloudData);
            // Re-fetch from local DB to get merged data
            data = await supplierDB.getAll();
            setSuppliers(data);
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
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const addSupplier = useCallback(async (supplierData) => {
    try {
      const newSupplier = await supplierDB.add(supplierData);
      setSuppliers(prev => [...prev, newSupplier]);
      return { success: true, data: newSupplier };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const updateSupplier = useCallback(async (id, updates) => {
    try {
      const updated = await supplierDB.update(id, updates);
      setSuppliers(prev => prev.map(s => s.id === id ? updated : s));
      return { success: true, data: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const deleteSupplier = useCallback(async (id) => {
    try {
      await supplierDB.delete(id);
      setSuppliers(prev => prev.filter(s => s.id !== id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  const searchSuppliers = useCallback(async (query) => {
    if (!query.trim()) {
      await fetchSuppliers();
      return;
    }
    try {
      const results = await supplierDB.search(query);
      setSuppliers(results);
    } catch (err) {
      setError(err.message);
    }
  }, [fetchSuppliers]);

  const getSupplierById = useCallback(async (id) => {
    try {
      return await supplierDB.getById(id);
    } catch (err) {
      return null;
    }
  }, []);

  return {
    suppliers,
    loading,
    error,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    searchSuppliers,
    getSupplierById,
    refresh: fetchSuppliers
  };
}

export default useSuppliers;
