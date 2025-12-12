'use client';

import { useState } from 'react';
import { Plus, Receipt, Filter, Image, List, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import useSuppliers from '@/hooks/useSuppliers';
import useTransactions from '@/hooks/useTransactions';
import { TransactionForm } from '@/components/TransactionForm';
import { TransactionTable } from '@/components/TransactionTable';
import { BillGallery } from '@/components/BillGallery';
import { QuickBillCapture } from '@/components/QuickBillCapture';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { toast } from 'sonner';

export default function TransactionsPage() {
  const { suppliers } = useSuppliers();
  const { transactions, loading, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('list');
  const [quickCaptureData, setQuickCaptureData] = useState(null);

  // Apply filters
  const filteredTransactions = transactions.filter(t => {
    if (statusFilter !== 'all' && t.paymentStatus !== statusFilter) return false;
    if (supplierFilter !== 'all' && t.supplierId !== supplierFilter) return false;
    return true;
  });

  // Calculate stats
  const totalAmount = filteredTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const paidAmount = filteredTransactions
    .filter(t => t.paymentStatus === 'paid')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const pendingAmount = filteredTransactions
    .filter(t => t.paymentStatus !== 'paid')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  // Count bills
  const totalBills = filteredTransactions.reduce((count, t) => 
    count + (t.billImages?.length || 0), 0
  );

  const handleAddTransaction = async (data) => {
    const result = await addTransaction(data);
    if (result.success) {
      toast.success('Transaction added successfully');
    } else {
      toast.error('Failed to add transaction');
    }
  };

  const handleEditTransaction = (transaction) => {
    setTransactionToEdit(transaction);
    setTransactionFormOpen(true);
  };

  const handleUpdateTransaction = async (data) => {
    const result = await updateTransaction(transactionToEdit.id, data);
    if (result.success) {
      toast.success('Transaction updated successfully');
      setTransactionToEdit(null);
    } else {
      toast.error('Failed to update transaction');
    }
  };

  const handleDeleteClick = (transaction) => {
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (transactionToDelete) {
      const result = await deleteTransaction(transactionToDelete.id);
      if (result.success) {
        toast.success('Transaction deleted successfully');
      } else {
        toast.error('Failed to delete transaction');
      }
      setTransactionToDelete(null);
    }
  };

  const handleQuickCapture = ({ supplierId, supplierName, images }) => {
    // Set the captured data and open the transaction form
    setQuickCaptureData({
      supplierId,
      images
    });
    setTransactionToEdit(null);
    setTransactionFormOpen(true);
    toast.success(`${images.length} bill(s) captured for ${supplierName}`);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">Manage all your transactions</p>
        </div>
      </div>

      {/* Quick Action Tiles */}
      <div className="grid grid-cols-2 gap-3">
        <QuickBillCapture 
          suppliers={suppliers}
          onCapture={handleQuickCapture}
          disabled={suppliers.length === 0}
          variant="tile"
        />
        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors border-dashed border-2 hover:border-primary/50"
          onClick={() => {
            setQuickCaptureData(null);
            setTransactionToEdit(null);
            setTransactionFormOpen(true);
          }}
        >
          <CardContent className="p-4 flex flex-col items-center justify-center gap-2 h-full min-h-[100px]">
            <div className="rounded-full bg-primary/10 p-3">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <span className="text-sm font-medium text-center">Add Transaction</span>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">₹{totalAmount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Amount</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500">₹{paidAmount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-500">₹{pendingAmount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{totalBills}</p>
            <p className="text-xs text-muted-foreground">Bill Photos</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filters:</span>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
          </SelectContent>
        </Select>
        <Select value={supplierFilter} onValueChange={setSupplierFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Supplier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            {suppliers.map(supplier => (
              <SelectItem key={supplier.id} value={supplier.id}>
                {supplier.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(statusFilter !== 'all' || supplierFilter !== 'all') && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setStatusFilter('all');
              setSupplierFilter('all');
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Tabs for List and Gallery view */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="gallery" className="gap-2">
            <Image alt="Bill Gallery" className="h-4 w-4" />
            Bill Gallery
            {totalBills > 0 && (
              <span className="ml-1 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                {totalBills}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Transactions List Tab */}
        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {filteredTransactions.length} Transaction{filteredTransactions.length !== 1 ? 's' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No transactions found</p>
                  {(statusFilter !== 'all' || supplierFilter !== 'all') ? (
                    <Button 
                      variant="link" 
                      className="mt-2"
                      onClick={() => {
                        setStatusFilter('all');
                        setSupplierFilter('all');
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : (
                    <Button 
                      variant="link" 
                      className="mt-2"
                      onClick={() => setTransactionFormOpen(true)}
                    >
                      Add your first transaction
                    </Button>
                  )}
                </div>
              ) : (
                <TransactionTable
                  transactions={filteredTransactions}
                  suppliers={suppliers}
                  onEdit={handleEditTransaction}
                  onDelete={handleDeleteClick}
                  loading={loading}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bill Gallery Tab */}
        <TabsContent value="gallery" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Image alt="All Bill Gallery" className="h-5 w-5" />
                All Bill Photos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BillGallery 
                transactions={filteredTransactions} 
                suppliers={suppliers} 
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transaction Form */}
      <TransactionForm
        open={transactionFormOpen}
        onOpenChange={(open) => {
          setTransactionFormOpen(open);
          if (!open) {
            setTransactionToEdit(null);
            setQuickCaptureData(null);
          }
        }}
        onSubmit={transactionToEdit ? handleUpdateTransaction : handleAddTransaction}
        suppliers={suppliers}
        initialData={transactionToEdit}
        quickCaptureData={quickCaptureData}
        title={transactionToEdit ? 'Edit Transaction' : 'Add Transaction'}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Transaction"
        description="Are you sure you want to delete this transaction? This action cannot be undone."
        itemName={transactionToDelete ? `₹${transactionToDelete.amount?.toLocaleString()}` : ''}
      />
    </div>
  );
}
