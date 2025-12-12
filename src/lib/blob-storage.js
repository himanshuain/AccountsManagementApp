import { put, del, list } from '@vercel/blob';

const DATA_PREFIX = 'data/';
const IMAGES_PREFIX = 'images/';
const BLOB_TIMEOUT = 5000; // 5 second timeout for blob operations

// Helper to add timeout to async operations
async function withTimeout(promise, ms, operation) {
  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error(`${operation} timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// Check if blob storage is configured
function isBlobConfigured() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

// Data storage functions
export async function saveDataToBlob(key, data) {
  if (!isBlobConfigured()) {
    console.warn('Blob storage not configured - skipping cloud save');
    return null;
  }
  
  try {
    // First, delete existing blob if it exists (Vercel Blob doesn't overwrite)
    try {
      const { blobs } = await withTimeout(
        list({ prefix: `${DATA_PREFIX}${key}` }),
        BLOB_TIMEOUT,
        'list'
      );
      for (const blob of blobs) {
        await del(blob.url);
      }
    } catch (deleteError) {
      // Ignore delete errors, proceed with creating new blob
    }
    
    // Now create new blob
    const blob = await put(`${DATA_PREFIX}${key}.json`, JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false,
    });
    return blob;
  } catch (error) {
    console.error(`[Blob] Error saving ${key}:`, error.message);
    return null;
  }
}

export async function loadDataFromBlob(key) {
  if (!isBlobConfigured()) {
    // Silently return null when blob storage isn't configured
    return null;
  }
  
  try {
    const { blobs } = await withTimeout(
      list({ prefix: `${DATA_PREFIX}${key}` }),
      BLOB_TIMEOUT,
      'list'
    );
    
    if (blobs.length === 0) {
      return null;
    }
    
    // Add cache-busting query param to ensure fresh data
    const url = new URL(blobs[0].url);
    url.searchParams.set('t', Date.now().toString());
    
    const response = await fetch(url.toString(), {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    if (!response.ok) return null;
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn(`Error loading ${key} from blob:`, error.message);
    return null;
  }
}

export async function deleteDataFromBlob(key) {
  if (!isBlobConfigured()) return;
  
  try {
    const { blobs } = await list({ prefix: `${DATA_PREFIX}${key}` });
    for (const blob of blobs) {
      await del(blob.url);
    }
  } catch (error) {
    console.warn(`Error deleting ${key} from blob:`, error.message);
  }
}

// Image storage functions
export async function uploadImage(file, folder = 'general') {
  if (!isBlobConfigured()) {
    console.warn('Blob storage not configured - image upload skipped');
    return null;
  }
  
  try {
    const filename = `${IMAGES_PREFIX}${folder}/${Date.now()}-${file.name}`;
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: true,
    });
    return blob.url;
  } catch (error) {
    console.warn('Error uploading image:', error.message);
    return null;
  }
}

export async function uploadImageFromBase64(base64Data, filename, folder = 'general') {
  if (!isBlobConfigured()) {
    console.warn('Blob storage not configured - image upload skipped');
    return null;
  }
  
  try {
    // Convert base64 to blob
    const response = await fetch(base64Data);
    const blob = await response.blob();
    
    const fullPath = `${IMAGES_PREFIX}${folder}/${Date.now()}-${filename}`;
    const result = await put(fullPath, blob, {
      access: 'public',
      addRandomSuffix: true,
    });
    return result.url;
  } catch (error) {
    console.warn('Error uploading image:', error.message);
    return null;
  }
}

export async function deleteImage(url) {
  if (!isBlobConfigured()) return false;
  
  try {
    await del(url);
    return true;
  } catch (error) {
    console.warn('Error deleting image:', error.message);
    return false;
  }
}

// Suppliers data
export async function saveSuppliers(suppliers) {
  return await saveDataToBlob('suppliers', suppliers);
}

export async function loadSuppliers() {
  const data = await loadDataFromBlob('suppliers');
  // Return null if load failed (timeout/error), empty array only if actually empty
  return data;
}

// Transactions data
export async function saveTransactions(transactions) {
  return await saveDataToBlob('transactions', transactions);
}

export async function loadTransactions() {
  const data = await loadDataFromBlob('transactions');
  // Return null if load failed (timeout/error), empty array only if actually empty
  return data;
}

// Sync operations - ONLY save if we successfully loaded existing data
export async function syncSuppliersToBlob(operations) {
  const existing = await loadSuppliers();
  
  // CRITICAL: If load failed (null), don't overwrite cloud data!
  if (existing === null) {
    console.warn('[Sync] Cannot sync suppliers - failed to load existing data from cloud');
    throw new Error('Failed to load existing suppliers from cloud');
  }
  
  let updated = [...existing];

  for (const op of operations) {
    if (op.operation === 'create') {
      const exists = updated.find(s => s.id === op.entityId);
      if (!exists) {
        updated.push(op.data);
      }
    } else if (op.operation === 'update') {
      const index = updated.findIndex(s => s.id === op.entityId);
      if (index >= 0) {
        updated[index] = op.data;
      } else {
        updated.push(op.data);
      }
    } else if (op.operation === 'delete') {
      updated = updated.filter(s => s.id !== op.entityId);
    }
  }

  await saveSuppliers(updated);
  return updated;
}

export async function syncTransactionsToBlob(operations) {
  const existing = await loadTransactions();
  
  // CRITICAL: If load failed (null), don't overwrite cloud data!
  if (existing === null) {
    console.warn('[Sync] Cannot sync transactions - failed to load existing data from cloud');
    throw new Error('Failed to load existing transactions from cloud');
  }
  
  let updated = [...existing];

  for (const op of operations) {
    if (op.operation === 'create') {
      const exists = updated.find(t => t.id === op.entityId);
      if (!exists) {
        updated.push(op.data);
      }
    } else if (op.operation === 'update') {
      const index = updated.findIndex(t => t.id === op.entityId);
      if (index >= 0) {
        updated[index] = op.data;
      } else {
        updated.push(op.data);
      }
    } else if (op.operation === 'delete') {
      updated = updated.filter(t => t.id !== op.entityId);
    }
  }

  await saveTransactions(updated);
  return updated;
}

export async function fullSync(localData) {
  const { suppliers, transactions } = localData;
  
  const cloudSuppliers = await loadSuppliers();
  const cloudTransactions = await loadTransactions();

  // Merge strategies: last write wins based on updatedAt
  const mergedSuppliers = mergeData(cloudSuppliers, suppliers);
  const mergedTransactions = mergeData(cloudTransactions, transactions);

  await saveSuppliers(mergedSuppliers);
  await saveTransactions(mergedTransactions);

  return { suppliers: mergedSuppliers, transactions: mergedTransactions };
}

function mergeData(cloudData, localData) {
  const merged = new Map();

  // Add cloud data first
  for (const item of cloudData) {
    merged.set(item.id, item);
  }

  // Merge local data (last write wins)
  for (const item of localData) {
    const existing = merged.get(item.id);
    if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) {
      merged.set(item.id, item);
    }
  }

  return Array.from(merged.values());
}
