"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  MapPin,
  FileText,
  Plus,
  IndianRupee,
  QrCode,
  ExternalLink,
  Copy,
  Check,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useSuppliers from "@/hooks/useSuppliers";
import useTransactions from "@/hooks/useTransactions";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { SupplierForm } from "@/components/SupplierForm";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionTable } from "@/components/TransactionTable";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { toast } from "sonner";

export default function SupplierDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const isOnline = useOnlineStatus();

  const { suppliers, getSupplierById, updateSupplier, deleteSupplier } =
    useSuppliers();
  const {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    recordPayment,
    markFullPaid,
  } = useTransactions(id);

  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [deleteTransactionDialogOpen, setDeleteTransactionDialogOpen] =
    useState(false);
  const [upiCopied, setUpiCopied] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentTransaction, setPaymentTransaction] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const paymentInputRef = useRef(null);

  useEffect(() => {
    const loadSupplier = async () => {
      const data = await getSupplierById(id);
      setSupplier(data);
      setLoading(false);
    };
    loadSupplier();
  }, [id, getSupplierById]);

  useEffect(() => {
    if (!loading) {
      const updatedSupplier = suppliers.find((s) => s.id === id);
      if (updatedSupplier) {
        setSupplier(updatedSupplier);
      }
    }
  }, [suppliers, id, loading]);

  // Auto-focus payment input
  useEffect(() => {
    if (paymentDialogOpen && paymentInputRef.current) {
      setTimeout(() => {
        paymentInputRef.current?.focus();
      }, 500);
    }
  }, [paymentDialogOpen]);

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        {/* Back button skeleton */}
        <div className="h-10 w-24 bg-muted rounded animate-pulse" />

        {/* Profile card skeleton */}
        <div className="bg-card border rounded-lg p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-3">
              <div className="h-6 w-48 bg-muted rounded animate-pulse" />
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              <div className="h-4 w-40 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border rounded-lg p-4 space-y-2">
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              <div className="h-6 w-20 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Transactions skeleton */}
        <div className="space-y-3">
          <div className="h-5 w-32 bg-muted rounded animate-pulse" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <div className="h-5 w-24 bg-muted rounded animate-pulse" />
                <div className="h-5 w-16 bg-muted rounded animate-pulse" />
              </div>
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="p-4 lg:p-6 text-center py-16">
        <h2 className="text-xl font-semibold mb-2">Supplier not found</h2>
        <p className="text-muted-foreground mb-4">
          The supplier you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link href="/suppliers">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Suppliers
          </Button>
        </Link>
      </div>
    );
  }

  // Display company name prominently
  const displayName = supplier.companyName || supplier.name;
  const secondaryName = supplier.companyName ? supplier.name : null;

  const initials =
    displayName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";

  const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  // Calculate paid amount considering partial payments
  const paidAmount = transactions.reduce((sum, t) => {
    if (t.paymentStatus === "paid") {
      return sum + (t.amount || 0);
    } else if (t.paymentStatus === "partial") {
      return sum + (t.paidAmount || 0);
    }
    return sum;
  }, 0);
  const pendingAmount = totalAmount - paidAmount;

  const handleUpdateSupplier = async (data) => {
    const result = await updateSupplier(id, data);
    if (result.success) {
      setSupplier(result.data);
      toast.success("Supplier updated");
    } else {
      toast.error("Failed to update supplier");
    }
  };

  const handleDeleteSupplier = async () => {
    const result = await deleteSupplier(id);
    if (result.success) {
      toast.success("Supplier deleted");
      router.push("/suppliers");
    } else {
      toast.error("Failed to delete supplier");
    }
  };

  const handleAddTransaction = async (data) => {
    const result = await addTransaction(data);
    if (result.success) {
      toast.success("Transaction added");
    } else {
      toast.error("Failed to add transaction");
    }
  };

  const handleEditTransaction = (transaction) => {
    setTransactionToEdit(transaction);
    setTransactionFormOpen(true);
  };

  const handleUpdateTransaction = async (data) => {
    const result = await updateTransaction(transactionToEdit.id, data);
    if (result.success) {
      toast.success("Transaction updated");
      setTransactionToEdit(null);
    } else {
      toast.error("Failed to update transaction");
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
        toast.success("Transaction deleted");
      } else {
        toast.error("Failed to delete transaction");
      }
      setTransactionToDelete(null);
    }
  };

  // Payment handling
  const handleOpenPayment = (transaction) => {
    const currentPaid = transaction.paidAmount || 0;
    const remaining = (transaction.amount || 0) - currentPaid;
    setPaymentTransaction(transaction);
    setPaymentAmount(remaining.toString());
    setPaymentDialogOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!paymentTransaction || !paymentAmount || Number(paymentAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const result = await recordPayment(
      paymentTransaction.id,
      Number(paymentAmount),
    );

    if (result.success) {
      toast.success(
        `₹${Number(paymentAmount).toLocaleString()} payment recorded`,
      );
      setPaymentDialogOpen(false);
      setPaymentTransaction(null);
      setPaymentAmount("");
    } else {
      toast.error(result.error || "Failed to record payment");
    }
  };

  const handleMarkFullPaid = async () => {
    if (!paymentTransaction) return;

    const result = await markFullPaid(paymentTransaction.id);

    if (result.success) {
      toast.success("Marked as fully paid");
      setPaymentDialogOpen(false);
      setPaymentTransaction(null);
      setPaymentAmount("");
    } else {
      toast.error(result.error || "Failed to mark as paid");
    }
  };

  const handleUpiClick = (app = "gpay") => {
    if (supplier?.upiId) {
      // Pre-fill amount if there's pending payment
      const amountParam = pendingAmount > 0 ? `&am=${pendingAmount}` : "";
      const upiParams = `pa=${encodeURIComponent(supplier.upiId)}&pn=${encodeURIComponent(displayName || "Supplier")}&cu=INR${amountParam}`;

      if (app === "gpay") {
        const gpayIntent = `intent://pay?${upiParams}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          window.location.href = `gpay://upi/pay?${upiParams}`;
        } else {
          window.location.href = gpayIntent;
        }
      } else if (app === "phonepe") {
        window.location.href = `phonepe://pay?${upiParams}`;
      } else if (app === "paytm") {
        window.location.href = `paytmmp://pay?${upiParams}`;
      } else {
        window.location.href = `upi://pay?${upiParams}`;
      }
    }
  };

  const handleCopyUpi = async () => {
    if (supplier?.upiId) {
      try {
        await navigator.clipboard.writeText(supplier.upiId);
        setUpiCopied(true);
        toast.success("UPI ID copied!");
        setTimeout(() => setUpiCopied(false), 2000);
      } catch (err) {
        toast.error("Failed to copy");
      }
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/suppliers">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{displayName}</h1>
          {secondaryName && (
            <p className="text-sm text-muted-foreground truncate">
              {secondaryName}
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setEditFormOpen(true)}
            disabled={!isOnline}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={!isOnline}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Profile Card with UPI */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <Avatar className="h-16 w-16 border-2 border-primary/10 shrink-0">
              <AvatarImage src={supplier.profilePicture} alt={displayName} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Details */}
            <div className="flex-1 min-w-0 space-y-2">
              {supplier.phone && (
                <a
                  href={`tel:${supplier.phone}`}
                  className="flex items-center gap-2 text-sm hover:text-primary"
                >
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{supplier.phone}</span>
                </a>
              )}
              {supplier.address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{supplier.address}</span>
                </div>
              )}
              {supplier.gstNumber && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4 shrink-0" />
                  <span>GST: {supplier.gstNumber}</span>
                </div>
              )}

              {/* Sync status */}
              {supplier.syncStatus === "pending" && (
                <Badge
                  variant="outline"
                  className="text-amber-600 border-amber-500/30"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse" />
                  Syncing
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* UPI Payment Section */}
      {(supplier.upiId || supplier.upiQrCode) && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              {/* QR Code */}
              {supplier.upiQrCode && (
                <div
                  className="w-20 h-20 rounded-lg overflow-hidden border-2 border-background shadow-lg cursor-pointer hover:scale-105 transition-transform relative shrink-0"
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
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <QrCode className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">UPI Payment</span>
                </div>

                {supplier.upiId && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 bg-muted rounded text-xs truncate max-w-[150px]">
                        {supplier.upiId}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyUpi}
                        className="h-7 w-7 p-0 shrink-0"
                      >
                        {upiCopied ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleUpiClick("gpay")}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-full text-xs font-medium hover:bg-blue-700 transition-colors"
                      >
                        GPay
                      </button>
                      <button
                        onClick={() => handleUpiClick("phonepe")}
                        className="px-3 py-1.5 bg-purple-600 text-white rounded-full text-xs font-medium hover:bg-purple-700 transition-colors"
                      >
                        PhonePe
                      </button>
                      <button
                        onClick={() => handleUpiClick("other")}
                        className="px-3 py-1.5 bg-muted text-foreground rounded-full text-xs font-medium hover:bg-accent transition-colors"
                      >
                        Other
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Transactions</h2>
          <Button
            size="sm"
            onClick={() => {
              setTransactionToEdit(null);
              setTransactionFormOpen(true);
            }}
            disabled={!isOnline}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {transactions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <IndianRupee className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No transactions yet</p>
              <Button
                variant="link"
                className="mt-2"
                onClick={() => setTransactionFormOpen(true)}
                disabled={!isOnline}
              >
                Add first transaction
              </Button>
            </CardContent>
          </Card>
        ) : (
          <TransactionTable
            transactions={transactions}
            suppliers={[supplier]}
            onEdit={handleEditTransaction}
            onDelete={handleDeleteTransactionClick}
            onPay={handleOpenPayment}
            showSupplier={false}
          />
        )}
      </div>

      {/* Payment Sheet */}
      <Sheet open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl p-0 flex flex-col max-h-[80vh]"
          hideClose
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          <SheetHeader className="px-6 pb-4">
            <SheetTitle>Pay Supplier</SheetTitle>
            <SheetDescription>
              Record a payment for this transaction
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="space-y-4 pb-4">
              {paymentTransaction && (
                <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="font-bold text-lg">
                      ₹{paymentTransaction.amount?.toLocaleString()}
                    </span>
                  </div>
                  {(paymentTransaction.paidAmount || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Already Paid</span>
                      <span className="font-medium text-green-600">
                        ₹{(paymentTransaction.paidAmount || 0).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm border-t pt-3">
                    <span className="text-amber-600 font-medium">Pending</span>
                    <span className="font-bold text-lg text-amber-600">
                      ₹
                      {(
                        (paymentTransaction.amount || 0) -
                        (paymentTransaction.paidAmount || 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                  {paymentTransaction.itemName && (
                    <div className="flex justify-between text-xs text-muted-foreground pt-1">
                      <span>Item</span>
                      <span className="truncate max-w-[150px]">
                        {paymentTransaction.itemName}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Amount Input */}
              <div className="space-y-2">
                <Label>Payment Amount (₹)</Label>
                <Input
                  ref={paymentInputRef}
                  type="number"
                  inputMode="numeric"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="text-3xl h-16 font-bold text-center"
                />
              </div>

              {/* UPI Quick Pay */}
              {supplier.upiId && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Quick Pay via UPI
                  </Label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpiClick("gpay")}
                      className="flex-1 px-3 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      GPay
                    </button>
                    <button
                      onClick={() => handleUpiClick("phonepe")}
                      className="flex-1 px-3 py-3 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"
                    >
                      PhonePe
                    </button>
                    <button
                      onClick={() => handleUpiClick("other")}
                      className="flex-1 px-3 py-3 bg-muted text-foreground rounded-xl text-sm font-medium hover:bg-accent transition-colors"
                    >
                      Other
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <SheetFooter className="px-6 py-4 border-t bg-background">
            <div className="flex flex-col gap-3 w-full">
              <div className="flex gap-3 w-full">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPaymentDialogOpen(false);
                    setPaymentTransaction(null);
                    setPaymentAmount("");
                  }}
                  className="flex-1 h-12"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRecordPayment}
                  className="flex-1 h-12 bg-green-600 hover:bg-green-700"
                  disabled={
                    !isOnline || !paymentAmount || Number(paymentAmount) <= 0
                  }
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </div>
              {paymentTransaction &&
                (paymentTransaction.amount || 0) -
                  (paymentTransaction.paidAmount || 0) >
                  0 && (
                  <Button
                    variant="outline"
                    onClick={handleMarkFullPaid}
                    className="w-full h-12 text-green-600 border-green-200 hover:bg-green-50"
                    disabled={!isOnline}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Mark Full Amount as Paid
                  </Button>
                )}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
        onSubmit={
          transactionToEdit ? handleUpdateTransaction : handleAddTransaction
        }
        suppliers={[supplier]}
        initialData={transactionToEdit}
        defaultSupplierId={id}
        title={transactionToEdit ? "Edit Transaction" : "Add Transaction"}
      />

      {/* Delete Supplier Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteSupplier}
        title="Delete Supplier"
        description="Are you sure? All transactions will also be deleted."
        itemName={displayName}
      />

      {/* Delete Transaction Confirmation */}
      <DeleteConfirmDialog
        open={deleteTransactionDialogOpen}
        onOpenChange={setDeleteTransactionDialogOpen}
        onConfirm={handleConfirmDeleteTransaction}
        title="Delete Transaction"
        description="This action cannot be undone."
        itemName={
          transactionToDelete
            ? `₹${transactionToDelete.amount?.toLocaleString()}`
            : ""
        }
      />

      {/* QR Code Full View Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center">Scan to Pay</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {supplier?.upiQrCode && (
              <div className="w-56 h-56 rounded-lg overflow-hidden border-2 border-muted relative bg-white">
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
            <Button onClick={() => handleUpiClick("other")} className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in UPI App
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
