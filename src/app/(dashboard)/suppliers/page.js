'use client';

import { useState } from 'react';
import { Search, Plus, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import useSuppliers from '@/hooks/useSuppliers';
import useTransactions from '@/hooks/useTransactions';
import { SupplierCard, SupplierCardSkeleton } from '@/components/SupplierCard';
import { SupplierForm } from '@/components/SupplierForm';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { toast } from 'sonner';

export default function SuppliersPage() {
  const { suppliers, loading, addSupplier, deleteSupplier, searchSuppliers } = useSuppliers();
  const { transactions } = useTransactions();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchSuppliers(query);
  };

  const handleAddSupplier = async (data) => {
    const result = await addSupplier(data);
    if (result.success) {
      toast.success('Supplier added successfully');
    } else {
      toast.error('Failed to add supplier');
    }
  };

  const handleDeleteClick = (supplier, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setSupplierToDelete(supplier);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (supplierToDelete) {
      const result = await deleteSupplier(supplierToDelete.id);
      if (result.success) {
        toast.success('Supplier deleted successfully');
      } else {
        toast.error('Failed to delete supplier');
      }
      setSupplierToDelete(null);
    }
  };

  const getTransactionCount = (supplierId) => {
    return transactions.filter(t => t.supplierId === supplierId).length;
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Suppliers</h1>
          <p className="text-muted-foreground">Manage your supplier information</p>
        </div>
        <Button onClick={() => setSupplierFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search suppliers..."
          value={searchQuery}
          onChange={handleSearch}
          className="pl-9"
        />
      </div>

      {/* Suppliers Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <SupplierCardSkeleton key={i} />
          ))}
        </div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No suppliers yet</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery 
              ? 'No suppliers match your search' 
              : 'Add your first supplier to get started'}
          </p>
          {!searchQuery && (
            <Button onClick={() => setSupplierFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((supplier) => (
            <SupplierCard 
              key={supplier.id} 
              supplier={supplier}
              transactionCount={getTransactionCount(supplier.id)}
            />
          ))}
        </div>
      )}

      {/* Add Supplier Form */}
      <SupplierForm
        open={supplierFormOpen}
        onOpenChange={setSupplierFormOpen}
        onSubmit={handleAddSupplier}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Supplier"
        description="Are you sure you want to delete this supplier? All their transactions will also be deleted. This action cannot be undone."
        itemName={supplierToDelete?.name}
      />
    </div>
  );
}

