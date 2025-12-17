"use client";

import { useState, useEffect, useRef } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Edit,
  Trash2,
  FileText,
  MoreVertical,
  Phone,
  User,
  IndianRupee,
  Plus,
  CreditCard,
  Image as ImageIcon,
  Receipt,
  ExternalLink,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ImageViewer } from "@/components/ImageViewer";
import { exportSupplierTransactionsPDF } from "@/lib/export";
import { toast } from "sonner";

export function SupplierDetailDrawer({
  supplier,
  transactions,
  isOnline,
  onEdit,
  onDelete,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onPayTransaction,
  onViewBillImages,
  onClose,
  imageViewerOpen,
  setImageViewerOpen,
  imageViewerSrc,
  setImageViewerSrc,
  imageViewerJustClosedRef,
}) {
  const [expandedTransactionId, setExpandedTransactionId] = useState(null);
  const expandedTransactionRef = useRef(null);

  // Scroll expanded transaction into view when it changes
  useEffect(() => {
    if (expandedTransactionId && expandedTransactionRef.current) {
      setTimeout(() => {
        expandedTransactionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 100);
    }
  }, [expandedTransactionId]);

  if (!supplier) return null;

  const supplierTransactions = transactions
    .filter(t => t.supplierId === supplier.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const formatPaymentDate = dateStr => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <Sheet
        open={!!supplier}
        onOpenChange={open => {
          // Don't close if image viewer was just closed (ref check)
          if (
            !open &&
            imageViewerJustClosedRef?.current
          ) {
            imageViewerJustClosedRef.current = false;
            return;
          }
          if (!open) onClose();
        }}
      >
        <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl p-0" hideClose>
          {/* Drag handle */}
          <div className="flex justify-center pb-2 pt-3" data-drag-handle>
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header with profile and actions */}
          <SheetHeader className="border-b px-4 pb-3">
            <div className="flex items-center gap-3">
              {/* Profile Picture */}
              <div
                className={cn(
                  "h-14 w-14 flex-shrink-0 cursor-pointer rounded-full p-0.5 touch-manipulation",
                  supplier.pendingAmount > 0
                    ? "bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500"
                    : "bg-gradient-to-tr from-green-400 via-emerald-500 to-teal-500"
                )}
                onClick={() => {
                  if (supplier.profilePicture) {
                    setImageViewerSrc(supplier.profilePicture);
                    setImageViewerOpen(true);
                  }
                }}
              >
                <div className="h-full w-full rounded-full bg-background p-0.5">
                  {supplier.profilePicture ? (
                    <img
                      src={supplier.profilePicture}
                      alt={supplier.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/10">
                      <span className="text-xl font-bold text-primary">
                        {supplier.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Name and info */}
              <div className="min-w-0 flex-1">
                <SheetTitle className="truncate pb-2 text-xl font-bold">
                  {supplier.companyName}
                </SheetTitle>
                {supplier.phone && (
                  <a
                    href={`tel:${supplier.phone}`}
                    className="inline-flex w-fit items-center gap-1 text-sm text-primary touch-manipulation"
                  >
                    <Phone className="h-3 w-3" />
                    {supplier.phone}
                  </a>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 touch-manipulation"
                  onClick={() => onEdit(supplier)}
                  disabled={!isOnline}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild className="z-[100]">
                    <Button variant="ghost" size="icon" className="h-9 w-9 touch-manipulation">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        try {
                          exportSupplierTransactionsPDF(supplier, supplierTransactions);
                          toast.success(`PDF exported for ${supplier.companyName}`);
                        } catch (error) {
                          console.error("PDF export failed:", error);
                          toast.error("Failed to export PDF");
                        }
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Export PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => {
                        onDelete(supplier);
                        onClose();
                      }}
                      disabled={!isOnline}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Vyapari
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </SheetHeader>
          <ScrollArea className="h-[calc(90vh-100px)] flex-1">
            <div className="space-y-4 p-4">
              {/* UPI QR Code if available */}
              {supplier.upiQrCode && (
                <div className="rounded-xl bg-muted/30 p-4 text-center">
                  <p className="mb-2 text-xs text-muted-foreground">UPI QR Code</p>
                  <img
                    src={supplier.upiQrCode}
                    alt="UPI QR"
                    className="mx-auto h-32 w-32 cursor-pointer rounded-lg transition-opacity hover:opacity-90 touch-manipulation"
                    onClick={() => {
                      setImageViewerSrc(supplier.upiQrCode);
                      setImageViewerOpen(true);
                    }}
                  />
                  {supplier.upiId && (
                    <a
                      href={`upi://pay?pa=${encodeURIComponent(supplier.upiId)}&pn=${encodeURIComponent(supplier.companyName || supplier.name || "")}`}
                      className="mt-2 inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline touch-manipulation"
                      onClick={e => e.stopPropagation()}
                    >
                      {supplier.upiId}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-muted/50 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Total</p>
                  <p className="text-lg font-bold">
                    ₹{(supplier.totalAmount || 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl bg-green-500/10 p-3 text-center">
                  <p className="text-[10px] text-green-600">Paid</p>
                  <p className="text-lg font-bold text-green-600">
                    ₹{(supplier.paidAmount || 0).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-500/10 p-3 text-center">
                  <p className="text-[10px] text-amber-600">Pending</p>
                  <p className="text-lg font-bold text-amber-600">
                    ₹{(supplier.pendingAmount || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Profile Details */}
              {(supplier.name ||
                supplier.address ||
                supplier.gstNumber ||
                (supplier.upiId && !supplier.upiQrCode)) && (
                <div className="space-y-3 rounded-xl border bg-card p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Profile Details
                  </h3>
                  <div className="grid gap-3 text-sm">
                    {supplier.name && (
                      <div className="flex items-start gap-3">
                        <span className="min-w-[80px] text-muted-foreground">Contact:</span>
                        <span className="font-medium">{supplier.name}</span>
                      </div>
                    )}
                    {supplier.address && (
                      <div className="flex items-start gap-3">
                        <span className="min-w-[80px] text-muted-foreground">Address:</span>
                        <span className="font-medium">{supplier.address}</span>
                      </div>
                    )}
                    {supplier.gstNumber && (
                      <div className="flex items-start gap-3">
                        <span className="min-w-[80px] text-muted-foreground">GST No:</span>
                        <span className="font-mono font-medium">
                          {supplier.gstNumber}
                        </span>
                      </div>
                    )}
                    {/* Only show UPI ID here if there's no QR code */}
                    {supplier.upiId && !supplier.upiQrCode && (
                      <div className="flex items-start gap-3">
                        <span className="min-w-[80px] text-muted-foreground">UPI ID:</span>
                        <a
                          href={`upi://pay?pa=${encodeURIComponent(supplier.upiId)}&pn=${encodeURIComponent(supplier.companyName || supplier.name || "")}`}
                          className="inline-flex items-center gap-1 font-mono font-medium text-primary hover:underline touch-manipulation"
                        >
                          {supplier.upiId}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Transactions Section */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">
                    Transactions ({supplierTransactions.length})
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAddTransaction()}
                    disabled={!isOnline}
                    className="touch-manipulation"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add
                  </Button>
                </div>

                {supplierTransactions.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <IndianRupee className="mx-auto mb-2 h-10 w-10 opacity-50" />
                    <p>No transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {supplierTransactions.map(txn => {
                      const amount = Number(txn.amount) || 0;
                      const paid =
                        txn.paymentStatus === "paid" ? amount : Number(txn.paidAmount) || 0;
                      const pending = amount - paid;
                      const isPaid = txn.paymentStatus === "paid";
                      const isPartial = txn.paymentStatus === "partial";
                      const hasPayments = txn.payments && txn.payments.length > 0;
                      const isExpanded = expandedTransactionId === txn.id;

                      return (
                        <Card
                          key={txn.id}
                          ref={isExpanded ? expandedTransactionRef : null}
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
                            <div
                              className={cn(
                                "p-3 transition-colors",
                                isExpanded
                                  ? "bg-primary/5"
                                  : hasPayments && "cursor-pointer hover:bg-muted/30 touch-manipulation"
                              )}
                              onClick={() =>
                                hasPayments &&
                                setExpandedTransactionId(isExpanded ? null : txn.id)
                              }
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="mb-0.5 flex items-center gap-2">
                                    <span className="text-lg font-bold">
                                      ₹{amount.toLocaleString()}
                                    </span>
                                    <Badge
                                      variant="secondary"
                                      className={cn(
                                        "text-xs",
                                        isPaid
                                          ? "bg-green-100 text-green-700"
                                          : isPartial
                                            ? "bg-blue-100 text-blue-700"
                                            : "bg-amber-100 text-amber-700"
                                      )}
                                    >
                                      {isPaid ? "Fully Paid" : isPartial ? "Partially Paid" : "Total Pending"}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {txn.date
                                      ? format(new Date(txn.date), "dd MMM yyyy")
                                      : "-"}
                                    {txn.itemName && ` • ${txn.itemName}`}
                                  </p>
                                </div>
                                {hasPayments && (
                                  <ChevronDown
                                    className={cn(
                                      "h-5 w-5 text-muted-foreground transition-transform",
                                      isExpanded && "rotate-180"
                                    )}
                                  />
                                )}
                              </div>

                              {/* Progress bar for partial */}
                              {isPartial && (
                                <div className="mt-2">
                                  <div className="mb-1 flex items-center justify-between text-xs">
                                    <span className="text-green-600">
                                      Paid: ₹{paid.toLocaleString()}
                                    </span>
                                    <span className="text-amber-600">
                                      Pending: ₹{pending.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                                    <div
                                      className="h-full rounded-full bg-green-500"
                                      style={{ width: `${(paid / amount) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Action Buttons - Always visible */}
                            <div className="flex flex-wrap items-center gap-2 border-t bg-muted/10 px-3 py-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 text-xs touch-manipulation"
                                onClick={e => onEditTransaction(txn, e)}
                                disabled={!isOnline}
                              >
                                <Edit className="mr-1 h-3 w-3" />
                                Edit
                              </Button>
                              {!isPaid && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-9 border-green-200 text-xs text-green-600 hover:bg-green-50 touch-manipulation"
                                  onClick={e => onPayTransaction(txn, e)}
                                  disabled={!isOnline}
                                >
                                  <CreditCard className="mr-1 h-3 w-3" />
                                  Record Payment
                                </Button>
                              )}
                              {txn.billImages && txn.billImages.length > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-9 border-blue-200 text-xs text-blue-600 hover:bg-blue-50 touch-manipulation"
                                  onClick={e => onViewBillImages(txn.billImages, e)}
                                >
                                  <ImageIcon className="mr-1 h-3 w-3" />
                                  Photos ({txn.billImages.length})
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 border-destructive/20 text-xs text-destructive hover:bg-destructive/10 touch-manipulation"
                                onClick={e => onDeleteTransaction(txn, e)}
                                disabled={!isOnline}
                              >
                                <Trash2 className="mr-1 h-3 w-3" />
                                Delete
                              </Button>
                            </div>

                            {/* Expanded Section - Payment History */}
                            {isExpanded && hasPayments && (
                              <div className="border-t bg-primary/5 px-3 pb-3">
                                <div className="pt-3">
                                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                                    Payment History
                                  </p>
                                  <div className="space-y-0">
                                    {txn.payments
                                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                                      .map((payment, index, arr) => (
                                        <div key={payment.id} className="flex">
                                          <div className="mr-3 flex flex-col items-center">
                                            <div
                                              className={cn(
                                                "flex h-3 w-3 items-center justify-center rounded-full",
                                                index === 0
                                                  ? "bg-green-500"
                                                  : "bg-green-400"
                                              )}
                                            >
                                              <CheckCircle2 className="h-2 w-2 text-white" />
                                            </div>
                                            {index < arr.length - 1 && (
                                              <div className="h-full min-h-[20px] w-0.5 bg-green-300" />
                                            )}
                                          </div>
                                          <div className="flex-1 pb-2">
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-green-600">
                                                ₹{payment.amount.toLocaleString()}
                                              </span>
                                                      <span className="text-xs text-muted-foreground">
                                                        — {formatPaymentDate(payment.date)}
                                                      </span>
                                              {payment.receiptUrl && (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-6 px-2 text-xs text-blue-600 touch-manipulation"
                                                  onClick={e => {
                                                    e.stopPropagation();
                                                    setImageViewerSrc(payment.receiptUrl);
                                                    setImageViewerOpen(true);
                                                  }}
                                                >
                                                  <Receipt className="mr-1 h-3 w-3" />
                                                  Receipt
                                                </Button>
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
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Notes */}
              {supplier.notes && (
                <div className="rounded-xl bg-muted/30 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm">{supplier.notes}</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Image Viewer */}
      <ImageViewer
        open={imageViewerOpen}
        onOpenChange={open => {
          if (!open) {
            imageViewerJustClosedRef.current = true;
            // Reset the ref after a short delay
            setTimeout(() => {
              imageViewerJustClosedRef.current = false;
            }, 100);
          }
          setImageViewerOpen(open);
        }}
        src={imageViewerSrc}
      />
    </>
  );
}

