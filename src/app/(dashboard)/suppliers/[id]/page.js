'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  FileText,
  CreditCard,
  Plus,
  IndianRupee
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import useSuppliers from '@/hooks/useSuppliers';
import useTransactions from '@/hooks/useTransactions';
import { SupplierForm } from '@/components/SupplierForm';
import { TransactionForm } from '@/components/TransactionForm';
import { TransactionTable } from '@/components/TransactionTable';
import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
import { toast } from 'sonner';

export default function SupplierDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  
  const { suppliers, getSupplierById, updateSupplier, deleteSupplier } = useSuppliers();
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useTransactions(id);
  
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [deleteTransactionDialogOpen, setDeleteTransactionDialogOpen] = useState(false);

  useEffect(() => {
    const loadSupplier = async () => {
      const data = await getSupplierById(id);
      setSupplier(data);
      setLoading(false);
    };
    loadSupplier();
  }, [id, getSupplierById, suppliers]);

  if (loading) {
    return (
      <div className="p-4 lg:p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-32 bg-muted rounded" />
          <div className="h-48 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="p-4 lg:p-6 text-center py-16">
        <h2 className="text-xl font-semibold mb-2">Supplier not found</h2>
        <p className="text-muted-foreground mb-4">The supplier you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/suppliers">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Suppliers
          </Button>
        </Link>
      </div>
    );
  }

  const initials = supplier.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const pendingAmount = transactions
    .filter(t => t.paymentStatus !== 'paid')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const handleUpdateSupplier = async (data) => {
    const result = await updateSupplier(id, data);
    if (result.success) {
      setSupplier(result.data);
      toast.success('Supplier updated successfully');
    } else {
      toast.error('Failed to update supplier');
    }
  };

  const handleDeleteSupplier = async () => {
    const result = await deleteSupplier(id);
    if (result.success) {
      toast.success('Supplier deleted successfully');
      router.push('/suppliers');
    } else {
      toast.error('Failed to delete supplier');
    }
  };

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

  const handleDeleteTransactionClick = (transaction) => {
    setTransactionToDelete(transaction);
    setDeleteTransactionDialogOpen(true);
  };

  const handleConfirmDeleteTransaction = async () => {
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

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/suppliers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{supplier.name}</h1>
          {supplier.companyName && (
            <p className="text-muted-foreground">{supplier.companyName}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setEditFormOpen(true)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar */}
            <Avatar className="h-24 w-24 border-4 border-primary/10">
              <AvatarImage src={supplier.profilePicture} alt={supplier.name} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Details */}
            <div className="flex-1 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{supplier.email}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{supplier.address}</span>
                  </div>
                )}
                {supplier.gstNumber && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>GST: {supplier.gstNumber}</span>
                  </div>
                )}
              </div>

              {/* Bank Details */}
              {supplier.bankDetails?.bankName && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Bank Details
                    </h4>
                    <div className="grid sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                      <div>
                        <span className="block text-xs">Bank</span>
                        <span className="text-foreground">{supplier.bankDetails.bankName}</span>
                      </div>
                      {supplier.bankDetails.accountNumber && (
                        <div>
                          <span className="block text-xs">Account</span>
                          <span className="text-foreground">{supplier.bankDetails.accountNumber}</span>
                        </div>
                      )}
                      {supplier.bankDetails.ifscCode && (
                        <div>
                          <span className="block text-xs">IFSC</span>
                          <span className="text-foreground">{supplier.bankDetails.ifscCode}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Sync status */}
              {supplier.syncStatus === 'pending' && (
                <Badge variant="secondary" className="text-amber-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse" />
                  Pending sync
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{transactions.length}</p>
            <p className="text-xs text-muted-foreground">Transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">₹{totalAmount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Amount</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">₹{pendingAmount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Transactions</CardTitle>
            <Button size="sm" onClick={() => {
              setTransactionToEdit(null);
              setTransactionFormOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <IndianRupee className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No transactions yet</p>
              <Button 
                variant="link" 
                className="mt-2"
                onClick={() => setTransactionFormOpen(true)}
              >
                Add first transaction
              </Button>
            </div>
          ) : (
            <TransactionTable
              transactions={transactions}
              suppliers={[supplier]}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransactionClick}
              showSupplier={false}
            />
          )}
        </CardContent>
      </Card>

      {/* Edit Supplier Form */}
      <SupplierForm
        open={editFormOpen}
        onOpenChange={setEditFormOpen}
        onSubmit={handleUpdateSupplier}
        initialData={supplier}
        title="Edit Supplier"
      />

      {/* Transaction Form */}
      <TransactionForm
        open={transactionFormOpen}
        onOpenChange={(open) => {
          setTransactionFormOpen(open);
          if (!open) setTransactionToEdit(null);
        }}
        onSubmit={transactionToEdit ? handleUpdateTransaction : handleAddTransaction}
        suppliers={[supplier]}
        initialData={transactionToEdit}
        defaultSupplierId={id}
        title={transactionToEdit ? 'Edit Transaction' : 'Add Transaction'}
      />

      {/* Delete Supplier Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteSupplier}
        title="Delete Supplier"
        description="Are you sure you want to delete this supplier? All their transactions will also be deleted. This action cannot be undone."
        itemName={supplier.name}
      />

      {/* Delete Transaction Confirmation */}
      <DeleteConfirmDialog
        open={deleteTransactionDialogOpen}
        onOpenChange={setDeleteTransactionDialogOpen}
        onConfirm={handleConfirmDeleteTransaction}
        title="Delete Transaction"
        description="Are you sure you want to delete this transaction? This action cannot be undone."
        itemName={transactionToDelete ? `₹${transactionToDelete.amount?.toLocaleString()}` : ''}
      />
    </div>
  );
}

