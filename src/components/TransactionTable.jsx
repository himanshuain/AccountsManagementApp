'use client';

import { useState, useMemo } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useTheme } from 'next-themes';
import { Edit, Trash2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Create MUI theme that syncs with app theme
const createMuiTheme = (isDark) => createTheme({
  palette: {
    mode: isDark ? 'dark' : 'light',
    primary: {
      main: '#f97316', // Orange
    },
    background: {
      default: isDark ? '#000000' : '#fafaf9',
      paper: isDark ? '#0a0a0a' : '#ffffff',
    },
    text: {
      primary: isDark ? '#fafafa' : '#0a0a0a',
      secondary: isDark ? '#a3a3a3' : '#737373',
    },
  },
  components: {
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          fontFamily: 'inherit',
          backgroundColor: isDark ? '#000000' : '#ffffff',
          '& .MuiDataGrid-cell:focus': {
            outline: 'none',
          },
          '& .MuiDataGrid-columnHeader:focus': {
            outline: 'none',
          },
          '& .MuiDataGrid-cell:focus-within': {
            outline: 'none',
          },
        },
        columnHeaders: {
          backgroundColor: isDark ? '#0a0a0a' : '#fafaf9',
          borderBottom: isDark ? '1px solid #1f1f1f' : '1px solid #e5e5e5',
        },
        columnHeader: {
          backgroundColor: isDark ? '#0a0a0a' : '#fafaf9',
          color: isDark ? '#fafafa' : '#0a0a0a',
          '&:focus': {
            outline: 'none',
          },
        },
        row: {
          backgroundColor: isDark ? '#000000' : '#ffffff',
          '&:hover': {
            backgroundColor: isDark ? '#141414' : '#fafaf9',
          },
          '&.Mui-selected': {
            backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
            '&:hover': {
              backgroundColor: isDark ? '#1f1f1f' : '#f0f0f0',
            },
          },
        },
        cell: {
          borderBottom: isDark ? '1px solid #1f1f1f' : '1px solid #e5e5e5',
          color: isDark ? '#fafafa' : '#0a0a0a',
        },
        footerContainer: {
          backgroundColor: isDark ? '#0a0a0a' : '#fafaf9',
          borderTop: isDark ? '1px solid #1f1f1f' : '1px solid #e5e5e5',
        },
        overlay: {
          backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
        },
      },
    },
    MuiTablePagination: {
      styleOverrides: {
        root: {
          color: isDark ? '#a3a3a3' : '#737373',
        },
        selectIcon: {
          color: isDark ? '#a3a3a3' : '#737373',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: isDark ? '#a3a3a3' : '#737373',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: {
          color: isDark ? '#a3a3a3' : '#737373',
        },
      },
    },
  },
});

const paymentStatusColors = {
  paid: 'bg-green-500/20 text-green-400 hover:bg-green-500/20 dark:bg-green-500/20 dark:text-green-400',
  pending: 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400',
  partial: 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400',
};

const paymentModeLabels = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
};

export function TransactionTable({ 
  transactions, 
  suppliers,
  onEdit, 
  onDelete,
  showSupplier = true,
  loading = false 
}) {
  const [selectedImages, setSelectedImages] = useState([]);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  
  const isDark = resolvedTheme === 'dark';
  
  // Memoize theme to prevent unnecessary re-renders
  const muiTheme = useMemo(() => createMuiTheme(isDark), [isDark]);

  const getSupplierName = (supplierId) => {
    const supplier = suppliers?.find(s => s.id === supplierId);
    return supplier?.name || 'Unknown';
  };

  const handleViewImages = (images) => {
    setSelectedImages(images);
    setImageDialogOpen(true);
  };

  const columns = [
    {
      field: 'date',
      headerName: 'Date',
      width: 110,
      valueFormatter: (value) => {
        if (!value) return '-';
        return new Date(value).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: '2-digit'
        });
      },
    },
    ...(showSupplier ? [{
      field: 'supplierId',
      headerName: 'Supplier',
      flex: 1,
      minWidth: 150,
      valueGetter: (value) => getSupplierName(value),
    }] : []),
    {
      field: 'amount',
      headerName: 'Amount',
      width: 120,
      valueFormatter: (value) => `₹${(value || 0).toLocaleString()}`,
    },
    {
      field: 'paymentStatus',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <Badge className={paymentStatusColors[params.value] || ''}>
          {params.value?.charAt(0).toUpperCase() + params.value?.slice(1)}
        </Badge>
      ),
    },
    {
      field: 'paymentMode',
      headerName: 'Mode',
      width: 110,
      valueFormatter: (value) => paymentModeLabels[value] || value,
    },
    {
      field: 'billImages',
      headerName: 'Bills',
      width: 80,
      renderCell: (params) => {
        const images = params.value || [];
        if (images.length === 0) return '-';
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewImages(images)}
            className="h-7 px-2"
          >
            <ImageIcon className="h-4 w-4 mr-1" />
            {images.length}
          </Button>
        );
      },
    },
    {
      field: 'actions',
      headerName: '',
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit?.(params.row)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete?.(params.row)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <div className="h-[400px] w-full rounded-lg border border-border overflow-hidden bg-background">
        <DataGrid
          rows={transactions}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
            sorting: { sortModel: [{ field: 'date', sort: 'desc' }] },
          }}
          getRowId={(row) => row.id}
          sx={{
            '& .MuiDataGrid-cell': {
              display: 'flex',
              alignItems: 'center',
            },
          }}
        />
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bill Images</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {selectedImages.map((url, index) => (
              <div key={index} className="aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={url}
                  alt={`Bill ${index + 1}`}
                  className="w-full h-full object-contain"
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </ThemeProvider>
  );
}

export default TransactionTable;
