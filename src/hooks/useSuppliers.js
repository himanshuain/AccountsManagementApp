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
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/a27a5c60-4ab9-4648-8ff3-b6b96bbdd86b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSuppliers.js:fetchSuppliers:localData',message:'Got local suppliers',data:{localCount:data.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'CLIENT'})}).catch(()=>{});
      // #endregion
      setSuppliers(data);
      
      // Then, try to fetch from cloud and merge
      try {
        const response = await fetch('/api/suppliers');
        if (response.ok) {
          const result = await response.json();
          const cloudData = result.data;
          // #region agent log
          fetch('http://127.0.0.1:7244/ingest/a27a5c60-4ab9-4648-8ff3-b6b96bbdd86b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSuppliers.js:fetchSuppliers:cloudData',message:'Got cloud suppliers',data:{cloudCount:cloudData?.length||0,cloudNames:cloudData?.map(s=>s.name)||[]},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'CLIENT'})}).catch(()=>{});
          // #endregion
          if (cloudData && cloudData.length > 0) {
            // Merge cloud data into local DB
            await bulkOperations.mergeSuppliers(cloudData);
            // Re-fetch from local DB to get merged data
            data = await supplierDB.getAll();
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/a27a5c60-4ab9-4648-8ff3-b6b96bbdd86b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSuppliers.js:fetchSuppliers:merged',message:'After merge',data:{mergedCount:data.length,mergedNames:data.map(s=>s.name)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'CLIENT'})}).catch(()=>{});
            // #endregion
            setSuppliers(data);
          }
        }
      } catch (cloudError) {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/a27a5c60-4ab9-4648-8ff3-b6b96bbdd86b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSuppliers.js:fetchSuppliers:cloudError',message:'Cloud fetch failed',data:{error:cloudError.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'CLIENT'})}).catch(()=>{});
        // #endregion
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
