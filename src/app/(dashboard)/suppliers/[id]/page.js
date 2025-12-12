'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
  IndianRupee,
  QrCode,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  const [upiCopied, setUpiCopied] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  useEffect(() => {
    const loadSupplier = async () => {
      const data = await getSupplierById(id);
      setSupplier(data);
      setLoading(false);
    };
    loadSupplier();
  }, [id, getSupplierById]);

  // Update local supplier when suppliers array changes (e.g., after sync completes)
  useEffect(() => {
    if (!loading) {
      const updatedSupplier = suppliers.find(s => s.id === id);
      if (updatedSupplier) {
        setSupplier(updatedSupplier);
      }
    }
  }, [suppliers, id, loading]);

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

  const handleUpiClick = (app = 'gpay') => {
    if (supplier?.upiId) {
      const upiParams = `pa=${encodeURIComponent(supplier.upiId)}&pn=${encodeURIComponent(supplier.name || 'Supplier')}&cu=INR`;
      
      // Google Pay specific intent for Android
      if (app === 'gpay') {
        // Try Google Pay intent first (Android)
        const gpayIntent = `intent://pay?${upiParams}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
        // For iOS, use tez:// scheme
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          window.location.href = `gpay://upi/pay?${upiParams}`;
        } else {
          window.location.href = gpayIntent;
        }
      } else if (app === 'phonepe') {
        window.location.href = `phonepe://pay?${upiParams}`;
      } else if (app === 'paytm') {
        window.location.href = `paytmmp://pay?${upiParams}`;
      } else {
        // Generic UPI link - opens app chooser
        window.location.href = `upi://pay?${upiParams}`;
      }
    }
  };

  const handleCopyUpi = async () => {
    if (supplier?.upiId) {
      try {
        await navigator.clipboard.writeText(supplier.upiId);
        setUpiCopied(true);
        toast.success('UPI ID copied!');
        setTimeout(() => setUpiCopied(false), 2000);
      } catch (err) {
        toast.error('Failed to copy');
      }
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

      {/* UPI Payment Section - Prominent at top */}
      {(supplier.upiId || supplier.upiQrCode) && (
        <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* QR Code */}
              {supplier.upiQrCode && (
                <div 
                  className="w-24 h-24 rounded-lg overflow-hidden border-2 border-white shadow-lg cursor-pointer hover:scale-105 transition-transform relative"
                  onClick={() => setQrDialogOpen(true)}
                >
                  <Image 
                    src={supplier.upiQrCode} 
                    alt="UPI QR Code" 
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              
              {/* UPI Details */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                  <QrCode className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-700">UPI Payment</span>
                </div>
                
                {supplier.upiId && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <code className="px-2 py-1 bg-muted rounded text-sm">{supplier.upiId}</code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyUpi}
                        className="h-7 px-2"
                      >
                        {upiCopied ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                      <button
                        onClick={() => handleUpiClick('gpay')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-full text-xs font-medium hover:bg-blue-700 transition-colors"
                      >
                        GPay
                      </button>
                      <button
                        onClick={() => handleUpiClick('phonepe')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-full text-xs font-medium hover:bg-purple-700 transition-colors"
                      >
                        PhonePe
                      </button>
                      <button
                        onClick={() => handleUpiClick('paytm')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white rounded-full text-xs font-medium hover:bg-sky-700 transition-colors"
                      >
                        Paytm
                      </button>
                      <button
                        onClick={() => handleUpiClick('other')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-muted text-foreground rounded-full text-xs font-medium hover:bg-accent transition-colors"
                      >
                        Other <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground mt-2">
                  Choose your preferred UPI app to pay
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* QR Code Full View Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Scan to Pay</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {supplier?.upiQrCode && (
              <div className="w-64 h-64 rounded-lg overflow-hidden border-2 border-muted relative bg-white">
                <Image 
                  src={supplier.upiQrCode} 
                  alt="UPI QR Code" 
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            )}
            {supplier?.upiId && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">UPI ID</p>
                <p className="font-medium">{supplier.upiId}</p>
              </div>
            )}
            <Button onClick={handleUpiClick} className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in UPI App
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

