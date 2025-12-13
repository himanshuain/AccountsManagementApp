"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Trash2,
  Image as ImageIcon,
  Calendar,
  User,
  ChevronDown,
  CreditCard,
  Receipt,
  CheckCircle2,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const paymentModeLabels = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank",
  cheque: "Cheque",
};

// Helper to format relative date
const formatRelativeDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now - date;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
};

export function TransactionTable({
  transactions,
  suppliers,
  onEdit,
  onDelete,
  onPay,
  showSupplier = true,
  loading = false,
}) {
  const [selectedImages, setSelectedImages] = useState([]);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [expandedTransactions, setExpandedTransactions] = useState({});

  const getSupplierName = (supplierId) => {
    const supplier = suppliers?.find((s) => s.id === supplierId);
    return supplier?.companyName || supplier?.name || "Unknown";
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

  const handlePayClick = (transaction, e) => {
    e.stopPropagation();
    onPay?.(transaction);
  };

  const handleEditClick = (transaction, e) => {
    e.stopPropagation();
    onEdit?.(transaction);
  };

  const toggleExpanded = (transactionId, e) => {
    e?.stopPropagation();
    setExpandedTransactions((prev) => ({
      ...prev,
      [transactionId]: !prev[transactionId],
    }));
  };

  const confirmDelete = () => {
    if (transactionToDelete) {
      onDelete?.(transactionToDelete);
    }
    setDeleteDialogOpen(false);
    setTransactionToDelete(null);
  };

  // Calculate totals - now considering partial payments
  const totals = transactions.reduce(
    (acc, t) => {
      const amount = Number(t.amount) || 0;
      const paidAmount = Number(t.paidAmount) || 0;
      acc.total += amount;
      if (t.paymentStatus === "paid") {
        acc.paid += amount;
      } else if (t.paymentStatus === "partial") {
        acc.paid += paidAmount;
        acc.pending += amount - paidAmount;
      } else {
        acc.pending += amount;
      }
      return acc;
    },
    { total: 0, paid: 0, pending: 0 },
  );

  // Sort by date (newest first)
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
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
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Total
                </p>
                <p className="text-xl font-bold">
                  ₹{totals.total.toLocaleString()}
                </p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-xs text-green-600 uppercase tracking-wide">
                  Paid
                </p>
                <p className="text-lg font-semibold text-green-600">
                  ₹{totals.paid.toLocaleString()}
                </p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-xs text-amber-600 uppercase tracking-wide">
                  Pending
                </p>
                <p className="text-lg font-semibold text-amber-600">
                  ₹{totals.pending.toLocaleString()}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {transactions.length} transaction
              {transactions.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <div className="space-y-2">
        {sortedTransactions.map((transaction) => {
          const hasPayments =
            transaction.payments && transaction.payments.length > 0;
          const isExpanded = expandedTransactions[transaction.id];
          const paidAmount = transaction.paidAmount || 0;
          const pendingAmount = (transaction.amount || 0) - paidAmount;
          const isPartial = transaction.paymentStatus === "partial";
          const isPaid = transaction.paymentStatus === "paid";

          return (
            <Card
              key={transaction.id}
              className={cn(
                "overflow-hidden transition-all",
                isPaid
                  ? "border-l-4 border-l-green-500"
                  : isPartial
                    ? "border-l-4 border-l-blue-500"
                    : "border-l-4 border-l-amber-500",
              )}
            >
              <CardContent className="p-0">
                {/* Main Transaction Row - Tap to expand */}
                <div
                  onClick={(e) => toggleExpanded(transaction.id, e)}
                  className="p-3 cursor-pointer hover:bg-muted/50 active:scale-[0.99] transition-all"
                >
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
                            isPaid
                              ? "bg-green-500/20 text-green-600"
                              : isPartial
                                ? "bg-blue-500/20 text-blue-600"
                                : "bg-amber-500/20 text-amber-600",
                          )}
                        >
                          {isPaid ? "Paid" : isPartial ? "Partial" : "Pending"}
                        </Badge>
                        {/* Payment mode */}
                        <span className="text-xs text-muted-foreground">
                          {paymentModeLabels[transaction.paymentMode] ||
                            transaction.paymentMode}
                        </span>
                      </div>

                      {/* Show partial payment progress */}
                      {isPartial && (
                        <div className="mb-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-green-600">
                              Paid: ₹{paidAmount.toLocaleString()}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-amber-600">
                              Pending: ₹{pendingAmount.toLocaleString()}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full transition-all"
                              style={{
                                width: `${(paidAmount / (transaction.amount || 1)) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {/* Date */}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(transaction.date).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                              year: "2-digit",
                            },
                          )}
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

                    {/* Right: Expand indicator */}
                    <div className="flex items-center">
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 text-muted-foreground transition-transform duration-200",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Expandable Section - Actions + Payment History */}
                {isExpanded && (
                  <div className="border-t bg-muted/30">
                    {/* Action Buttons */}
                    <div className="p-3 flex items-center gap-2 flex-wrap">
                      {/* Edit button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleEditClick(transaction, e)}
                        className="h-9 px-3 text-sm"
                      >
                        <Edit className="h-4 w-4 mr-1.5" />
                        Edit
                      </Button>

                      {/* Pay button for pending/partial transactions */}
                      {!isPaid && onPay && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handlePayClick(transaction, e)}
                          className="h-9 px-3 text-sm bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                        >
                          <CreditCard className="h-4 w-4 mr-1.5" />
                          Pay
                        </Button>
                      )}

                      {/* Bill images */}
                      {transaction.billImages?.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) =>
                            handleViewImages(transaction.billImages, e)
                          }
                          className="h-9 px-3 text-sm"
                        >
                          <ImageIcon className="h-4 w-4 mr-1.5" />
                          Bills ({transaction.billImages.length})
                        </Button>
                      )}

                      {/* Delete - pushed to end */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleDeleteClick(transaction, e)}
                        className="h-9 px-3 text-sm text-destructive border-destructive/30 hover:bg-destructive/10 ml-auto"
                      >
                        <Trash2 className="h-4 w-4 mr-1.5" />
                        Delete
                      </Button>
                    </div>

                    {/* Payment Timeline (if has payments) */}
                    {hasPayments && (
                      <div className="px-3 pb-3 border-t">
                        <div className="pt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Payment History
                          </p>
                          <div className="space-y-0">
                            {transaction.payments
                              .sort(
                                (a, b) => new Date(b.date) - new Date(a.date),
                              )
                              .map((payment, index, arr) => (
                                <div key={payment.id} className="flex">
                                  {/* Timeline line and dot */}
                                  <div className="flex flex-col items-center mr-3">
                                    <div
                                      className={cn(
                                        "w-3 h-3 rounded-full flex items-center justify-center",
                                        index === 0
                                          ? "bg-green-500"
                                          : "bg-green-400",
                                      )}
                                    >
                                      <CheckCircle2 className="w-2 h-2 text-white" />
                                    </div>
                                    {index < arr.length - 1 && (
                                      <div className="w-0.5 h-full min-h-[24px] bg-green-300" />
                                    )}
                                  </div>

                                  {/* Payment details */}
                                  <div className="flex-1 pb-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-green-600">
                                        ₹{payment.amount.toLocaleString()}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        — {formatRelativeDate(payment.date)}
                                      </span>
                                      {payment.receiptUrl && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedImages([
                                              payment.receiptUrl,
                                            ]);
                                            setImageDialogOpen(true);
                                          }}
                                          className="text-xs text-primary hover:underline flex items-center gap-0.5"
                                        >
                                          <Receipt className="h-3 w-3" />
                                          Receipt
                                        </button>
                                      )}
                                    </div>
                                    {payment.isFinalPayment && (
                                      <span className="text-xs text-green-600">
                                        Final payment
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedImages.length === 1 ? "Receipt" : "Bill Images"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {selectedImages.map((url, index) => (
              <div
                key={index}
                className={cn(
                  "aspect-square rounded-lg overflow-hidden bg-muted",
                  selectedImages.length === 1 && "col-span-2",
                )}
              >
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
              This will permanently delete this transaction. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default TransactionTable;
