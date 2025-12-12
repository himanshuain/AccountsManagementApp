import { format } from 'date-fns';

/**
 * Convert data to CSV format and trigger download
 */
export function exportToCSV(data, filename, columns) {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Create header row
  const headers = columns.map(col => col.label).join(',');
  
  // Create data rows
  const rows = data.map(item => {
    return columns.map(col => {
      let value = col.getValue ? col.getValue(item) : item[col.key];
      
      // Handle null/undefined
      if (value === null || value === undefined) {
        value = '';
      }
      
      // Escape quotes and wrap in quotes if contains comma
      value = String(value);
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      
      return value;
    }).join(',');
  });

  // Combine header and rows
  const csv = [headers, ...rows].join('\n');
  
  // Create and trigger download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export suppliers to CSV
 */
export function exportSuppliers(suppliers) {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'companyName', label: 'Company' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'address', label: 'Address' },
    { key: 'gstNumber', label: 'GST Number' },
    { key: 'upiId', label: 'UPI ID' },
    { 
      key: 'bankName', 
      label: 'Bank Name',
      getValue: (item) => item.bankDetails?.bankName || ''
    },
    { 
      key: 'accountNumber', 
      label: 'Account Number',
      getValue: (item) => item.bankDetails?.accountNumber || ''
    },
    { 
      key: 'ifscCode', 
      label: 'IFSC Code',
      getValue: (item) => item.bankDetails?.ifscCode || ''
    },
    { 
      key: 'category', 
      label: 'Category',
      getValue: (item) => item.category || ''
    },
    { 
      key: 'createdAt', 
      label: 'Created At',
      getValue: (item) => item.createdAt ? format(new Date(item.createdAt), 'yyyy-MM-dd') : ''
    },
  ];
  
  exportToCSV(suppliers, 'suppliers', columns);
}

/**
 * Export transactions to CSV
 */
export function exportTransactions(transactions, suppliers) {
  const getSupplierName = (supplierId) => {
    const supplier = suppliers?.find(s => s.id === supplierId);
    return supplier?.name || 'Unknown';
  };

  const columns = [
    { 
      key: 'date', 
      label: 'Date',
      getValue: (item) => item.date ? format(new Date(item.date), 'yyyy-MM-dd') : ''
    },
    { 
      key: 'supplier', 
      label: 'Supplier',
      getValue: (item) => getSupplierName(item.supplierId)
    },
    { key: 'amount', label: 'Amount' },
    { key: 'paymentStatus', label: 'Payment Status' },
    { key: 'paymentMode', label: 'Payment Mode' },
    { 
      key: 'items', 
      label: 'Items',
      getValue: (item) => {
        if (!item.items || !Array.isArray(item.items)) return '';
        return item.items.map(i => `${i.name || 'Item'} (${i.quantity}x${i.rate})`).join('; ');
      }
    },
    { 
      key: 'dueDate', 
      label: 'Due Date',
      getValue: (item) => item.dueDate ? format(new Date(item.dueDate), 'yyyy-MM-dd') : ''
    },
    { key: 'notes', label: 'Notes' },
    { 
      key: 'billImages', 
      label: 'Bill Count',
      getValue: (item) => item.billImages?.length || 0
    },
  ];
  
  exportToCSV(transactions, 'transactions', columns);
}

/**
 * Export report summary to CSV
 */
export function exportReport(data, title) {
  const columns = Object.keys(data[0] || {}).map(key => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
  }));
  
  exportToCSV(data, title, columns);
}

