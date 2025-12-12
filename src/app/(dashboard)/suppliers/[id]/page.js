"use client";

import { useState, useEffect, use } from "react";
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
import useSuppliers from "@/hooks/useSuppliers";
import useTransactions from "@/hooks/useTransactions";
import { SupplierForm } from "@/components/SupplierForm";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionTable } from "@/components/TransactionTable";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { toast } from "sonner";

export default function SupplierDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const { suppliers, getSupplierById, updateSupplier, deleteSupplier } =
    useSuppliers();
  const { transactions, addTransaction, updateTransaction, deleteTransaction } =
    useTransactions(id);

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
  const paidAmount = transactions
    .filter((t) => t.paymentStatus === "paid")
    .reduce((sum, t) => sum + (t.amount || 0), 0);
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

  const handleUpiClick = (app = "gpay") => {
    if (supplier?.upiId) {
      const upiParams = `pa=${encodeURIComponent(supplier.upiId)}&pn=${encodeURIComponent(displayName || "Supplier")}&cu=INR`;

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
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDeleteDialogOpen(true)}
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

      {/* Stats - Combined in one card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-2xl font-bold">{transactions.length}</p>
              <p className="text-xs text-muted-foreground">Transactions</p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="text-center flex-1">
              <p className="text-2xl font-bold">
                ₹{totalAmount.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-green-600">
                ₹{paidAmount.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Paid</p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-amber-600">
                ₹{pendingAmount.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
            showSupplier={false}
          />
        )}
      </div>

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
