"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Trash2,
  Image as ImageIcon,
  Calendar,
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
import { ImageGalleryViewer } from "./PhotoViewer";
import { useProgressiveList, LoadMoreTrigger } from "@/hooks/useProgressiveList";
import { resolveImageUrl } from "@/lib/image-url";

const paymentModeLabels = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank",
  cheque: "Cheque",
};

// Helper to format relative date
const formatRelativeDate = dateString => {
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
  customers,
  onEdit,
  onDelete,
  onPay,
  showSupplier = true,
  showCustomer = false,
  loading = false,
}) {
  const [selectedImages, setSelectedImages] = useState([]);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [expandedTransactions, setExpandedTransactions] = useState({});

  const getSupplier = supplierId => {
    return suppliers?.find(s => s.id === supplierId);
  };

  const getSupplierName = supplierId => {
    const supplier = getSupplier(supplierId);
    return supplier?.companyName || supplier?.name || "Unknown";
  };

  const getCustomer = customerId => {
    return customers?.find(c => c.id === customerId);
  };

  const getCustomerName = customerId => {
    const customer = getCustomer(customerId);
    return customer?.name || "Unknown";
  };

  const handleViewImages = (images, e) => {
    e.stopPropagation();
    setSelectedImages(images.map(img => resolveImageUrl(img)));
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
    setExpandedTransactions(prev => ({
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
    { total: 0, paid: 0, pending: 0 }
  );

  // Use transactions as-is (sorting is handled by parent component)
  // Progressive loading for large lists
  const {
    visibleItems: visibleTransactions,
    hasMore,
    loadMore,
    loadMoreRef,
    remainingCount,
    totalCount,
  } = useProgressiveList(transactions, 15, 15);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-16 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>No transactions found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
                <p className="text-xl font-bold">₹{totals.total.toLocaleString()}</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-xs uppercase tracking-wide text-green-600">Paid</p>
                <p className="text-lg font-semibold text-green-600">
                  ₹{totals.paid.toLocaleString()}
                </p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-xs uppercase tracking-wide text-amber-600">Pending</p>
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
        {visibleTransactions.map(transaction => {
          const hasPayments = transaction.payments && transaction.payments.length > 0;
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
                isExpanded && "shadow-md ring-2 ring-primary/20"
              )}
            >
              <CardContent className="p-0">
                {/* Main Transaction Row - Tap to expand if has payments */}
                <div
                  onClick={e => hasPayments && toggleExpanded(transaction.id, e)}
                  className={cn(
                    "p-3 transition-all",
                    isExpanded
                      ? "bg-primary/5"
                      : hasPayments && "cursor-pointer hover:bg-muted/50 active:scale-[0.99]"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Main info */}
                    <div className="min-w-0 flex-1">
                      {/* Supplier with DP */}
                      {showSupplier &&
                        (() => {
                          const supplier = getSupplier(transaction.supplierId);
                          return (
                            <div className="mb-1">
                              <Link
                                href={`/suppliers/${transaction.supplierId}`}
                                className="inline-flex items-center gap-2 transition-opacity hover:opacity-80"
                                onClick={e => e.stopPropagation()}
                              >
                                {supplier?.profilePicture ? (
                                  <img
                                    src={resolveImageUrl(supplier.profilePicture)}
                                    alt=""
                                    className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/20">
                                    <span className="text-xs font-semibold text-primary">
                                      {(supplier?.name || "?").charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                <span className="truncate text-base font-bold">
                                  {getSupplierName(transaction.supplierId)}
                                </span>
                              </Link>
                            </div>
                          );
                        })()}

                      {/* Customer with DP */}
                      {showCustomer &&
                        transaction.customerId &&
                        (() => {
                          const customer = getCustomer(transaction.customerId);
                          return (
                            <div className="mb-1">
                              <Link
                                href={`/customers?open=${transaction.customerId}`}
                                className="inline-flex items-center gap-2 transition-opacity hover:opacity-80"
                                onClick={e => e.stopPropagation()}
                              >
                                {customer?.profilePicture ? (
                                  <img
                                    src={resolveImageUrl(customer.profilePicture)}
                                    alt=""
                                    className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                                    <span className="text-xs font-semibold text-amber-600">
                                      {(customer?.name || "?").charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                <span className="truncate text-base font-bold">
                                  {getCustomerName(transaction.customerId)}
                                </span>
                              </Link>
                            </div>
                          );
                        })()}

                      <div className="mb-1 flex items-center gap-2">
                        {/* Amount */}
                        <span className="text-lg font-bold">
                          ₹{(transaction.amount || 0).toLocaleString()}
                        </span>
                        {/* Status badge */}
                        <Badge
                          variant="secondary"
                          className={cn(
                            "px-1.5 py-0 text-xs",
                            isPaid
                              ? "bg-green-500/20 text-green-600"
                              : isPartial
                                ? "bg-blue-500/20 text-blue-600"
                                : "bg-amber-500/20 text-amber-600"
                          )}
                        >
                          {isPaid ? "Fully Paid" : isPartial ? "Partially Paid" : "Total Pending"}
                        </Badge>
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
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-green-500 transition-all"
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
                          {new Date(transaction.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "2-digit",
                          })}
                        </span>

                        {/* Payment mode */}
                        <span className="flex items-center gap-1">
                          <CreditCard className="h-3 w-3" />
                          {paymentModeLabels[transaction.paymentMode] || transaction.paymentMode}
                        </span>

                        {/* Item name */}
                        {transaction.itemName && (
                          <span className="max-w-[80px] truncate">{transaction.itemName}</span>
                        )}
                      </div>

                      {/* Notes if present */}
                      {transaction.notes && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {transaction.notes}
                        </p>
                      )}
                    </div>

                    {/* Right: Expand indicator - only show if has payments */}
                    {hasPayments && (
                      <div className="flex items-center">
                        <ChevronDown
                          className={cn(
                            "h-5 w-5 text-muted-foreground transition-transform duration-200",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Expandable Section - Actions + Payment History - only show if has payments */}
                {isExpanded && hasPayments && (
                  <div className="border-t bg-primary/5">
                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 p-3">
                      {/* Edit button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={e => handleEditClick(transaction, e)}
                        className="h-9 px-3 text-sm"
                      >
                        <Edit className="mr-1.5 h-4 w-4" />
                        Edit
                      </Button>

                      {/* Pay button for pending/partial transactions */}
                      {!isPaid && onPay && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={e => handlePayClick(transaction, e)}
                          className="h-9 border-green-200 bg-green-50 px-3 text-sm text-green-700 hover:bg-green-100"
                        >
                          <CreditCard className="mr-1.5 h-4 w-4" />
                          Pay
                        </Button>
                      )}

                      {/* Bill/Khata photos */}
                      {transaction.billImages?.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={e => handleViewImages(transaction.billImages, e)}
                          className="h-9 border-blue-200 px-3 text-sm text-blue-600 hover:bg-blue-50"
                        >
                          <ImageIcon className="mr-1.5 h-4 w-4" />
                          Photos ({transaction.billImages.length})
                        </Button>
                      )}

                      {/* Delete - pushed to end */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={e => handleDeleteClick(transaction, e)}
                        className="ml-auto h-9 border-destructive/30 px-3 text-sm text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        Delete
                      </Button>
                    </div>

                    {/* Payment Timeline (if has payments) */}
                    {hasPayments && (
                      <div className="border-t px-3 pb-3">
                        <div className="pt-3">
                          <p className="mb-2 text-xs font-medium text-muted-foreground">
                            Payment History
                          </p>
                          <div className="space-y-0">
                            {transaction.payments
                              .sort((a, b) => new Date(a.date) - new Date(b.date))
                              .map((payment, index, arr) => (
                                <div key={payment.id} className="flex">
                                  {/* Timeline line and dot */}
                                  <div className="mr-3 flex flex-col items-center">
                                    <div
                                      className={cn(
                                        "flex h-3 w-3 items-center justify-center rounded-full",
                                        index === arr.length - 1 ? "bg-green-500" : "bg-green-400"
                                      )}
                                    >
                                      <CheckCircle2 className="h-2 w-2 text-white" />
                                    </div>
                                    {index < arr.length - 1 && (
                                      <div className="h-full min-h-[24px] w-0.5 bg-green-300" />
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
                                          onClick={e => {
                                            e.stopPropagation();
                                            setSelectedImages([
                                              resolveImageUrl(payment.receiptUrl),
                                            ]);
                                            setImageDialogOpen(true);
                                          }}
                                          className="ml-auto rounded-full bg-primary/10 p-1.5 text-primary transition-colors hover:bg-primary/20"
                                          title="View Receipt"
                                        >
                                          <Receipt className="h-4 w-4" />
                                        </button>
                                      )}
                                    </div>
                                    {payment.notes && (
                                      <p className="mt-0.5 text-xs italic text-muted-foreground">
                                        &quot;{payment.notes}&quot;
                                      </p>
                                    )}
                                    {payment.isFinalPayment && (
                                      <span className="text-xs text-green-600">Final payment</span>
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

        {/* Load More Trigger */}
        <LoadMoreTrigger
          loadMoreRef={loadMoreRef}
          hasMore={hasMore}
          remainingCount={remainingCount}
          onLoadMore={loadMore}
          totalCount={totalCount}
        />
      </div>

      {/* Image Gallery Viewer with Zoom */}
      <ImageGalleryViewer
        images={selectedImages}
        initialIndex={0}
        open={imageDialogOpen}
        onOpenChange={setImageDialogOpen}
      />

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
