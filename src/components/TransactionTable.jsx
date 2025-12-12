'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Edit, Trash2, Image as ImageIcon, Calendar, User, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

const paymentModeLabels = {
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank',
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  const getSupplierName = (supplierId) => {
    const supplier = suppliers?.find(s => s.id === supplierId);
    return supplier?.companyName || supplier?.name || 'Unknown';
  };

  const handleViewImages = (images, e) => {
    e.stopPropagation();
    setSelectedImages(images);
    setImageDialogOpen(true);
  };

  const handleDeleteClick = (transaction, e) => {
    e.stopPropagation();
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (transactionToDelete) {
      onDelete?.(transactionToDelete);
    }
    setDeleteDialogOpen(false);
    setTransactionToDelete(null);
  };

  // Calculate totals
  const totals = transactions.reduce((acc, t) => {
    const amount = Number(t.amount) || 0;
    acc.total += amount;
    if (t.paymentStatus === 'paid') {
      acc.paid += amount;
    } else {
      acc.pending += amount;
    }
    return acc;
  }, { total: 0, paid: 0, pending: 0 });

  // Sort by date (newest first)
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No transactions found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
                <p className="text-xl font-bold">₹{totals.total.toLocaleString()}</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-xs text-green-600 uppercase tracking-wide">Paid</p>
                <p className="text-lg font-semibold text-green-600">₹{totals.paid.toLocaleString()}</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-xs text-amber-600 uppercase tracking-wide">Pending</p>
                <p className="text-lg font-semibold text-amber-600">₹{totals.pending.toLocaleString()}</p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <div className="space-y-2">
        {sortedTransactions.map((transaction) => (
          <Card 
            key={transaction.id}
            className={cn(
              "overflow-hidden transition-all hover:shadow-md",
              transaction.paymentStatus === 'paid' 
                ? "border-l-4 border-l-green-500" 
                : "border-l-4 border-l-amber-500"
            )}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-3">
                {/* Left: Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {/* Amount - Most prominent */}
                    <span className="text-lg font-bold">
                      ₹{(transaction.amount || 0).toLocaleString()}
                    </span>
                    {/* Status badge */}
                    <Badge 
                      variant="secondary"
                      className={cn(
                        "text-xs px-1.5 py-0",
                        transaction.paymentStatus === 'paid' 
                          ? "bg-green-500/20 text-green-600" 
                          : "bg-amber-500/20 text-amber-600"
                      )}
                    >
                      {transaction.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                    </Badge>
                    {/* Payment mode */}
                    <span className="text-xs text-muted-foreground">
                      {paymentModeLabels[transaction.paymentMode] || transaction.paymentMode}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {/* Date */}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(transaction.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: '2-digit'
                      })}
                    </span>
                    
                    {/* Supplier */}
                    {showSupplier && (
                      <Link 
                        href={`/suppliers/${transaction.supplierId}`}
                        className="flex items-center gap-1 hover:text-primary transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <User className="h-3 w-3" />
                        <span className="truncate max-w-[120px]">
                          {getSupplierName(transaction.supplierId)}
                        </span>
                      </Link>
                    )}

                    {/* Item name */}
                    {transaction.itemName && (
                      <span className="truncate max-w-[80px]">
                        {transaction.itemName}
                      </span>
                    )}
                  </div>

                  {/* Notes if present */}
                  {transaction.notes && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {transaction.notes}
                    </p>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1">
                  {/* Bill images */}
                  {transaction.billImages?.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleViewImages(transaction.billImages, e)}
                      className="h-8 w-8 p-0"
                    >
                      <ImageIcon className="h-4 w-4" />
                      <span className="sr-only">{transaction.billImages.length} bills</span>
                    </Button>
                  )}
                  
                  {/* Edit */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(transaction);
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDeleteClick(transaction, e)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bill Images</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {selectedImages.map((url, index) => (
              <div key={index} className="aspect-square rounded-lg overflow-hidden bg-muted">
                <img
                  src={url}
                  alt={`Bill ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this transaction. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default TransactionTable;
