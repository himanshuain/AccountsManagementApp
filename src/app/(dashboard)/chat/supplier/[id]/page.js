"use client";

import { use, useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Edit, Trash2, FileText, Image as ImageIcon, CheckCircle2, Clock, Receipt } from "lucide-react";
import useSuppliers from "@/hooks/useSuppliers";
import useTransactions from "@/hooks/useTransactions";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { TransactionForm } from "@/components/TransactionForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { ImageGalleryViewer } from "@/components/PhotoViewer";
import { DragCloseDrawer } from "@/components/ui/drag-close-drawer";
import { SwipeCarousel } from "@/components/ui/swipe-carousel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { haptics } from "@/hooks/useHaptics";
import { resolveImageUrl } from "@/lib/image-url";

// GPay Components
import {
  ChatHeader,
  PaymentProgress,
  ChatBubble,
  DateSeparator,
  QuickActionBar,
  ProfileSheet,
  PaymentBubble,
  LumpsumPaymentDrawer,
} from "@/components/gpay";

export default function SupplierChatPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const chatContainerRef = useRef(null);

  const { suppliers, updateSupplier, deleteSupplier } = useSuppliers();
  const {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    recordPayment,
    markFullPaid,
  } = useTransactions(null, { fetchAll: true });

  // State
  const [profileOpen, setProfileOpen] = useState(false);
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [billDrawerOpen, setBillDrawerOpen] = useState(false);
  const [selectedBillItem, setSelectedBillItem] = useState(null);
  const [selectedBillType, setSelectedBillType] = useState(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

  // Get supplier
  const supplier = useMemo(() => {
    return suppliers.find(s => s.id === id);
  }, [suppliers, id]);

  // Get supplier's transactions
  const supplierTransactions = useMemo(() => {
    return transactions
      .filter(t => t.supplierId === id)
      .sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));
  }, [transactions, id]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalAmount = supplierTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const paidAmount = supplierTransactions.reduce((sum, t) => {
      if (t.paymentStatus === "paid") return sum + (Number(t.amount) || 0);
      if (t.paymentStatus === "partial") return sum + (Number(t.paidAmount) || 0);
      return sum;
    }, 0);
    return {
      total: totalAmount,
      paid: paidAmount,
      pending: Math.max(0, totalAmount - paidAmount),
    };
  }, [supplierTransactions]);

  // Pending items sorted earliest first (for lumpsum payment)
  const pendingItems = useMemo(() => {
    return supplierTransactions
      .filter(t => t.paymentStatus !== "paid")
      .map(t => {
        const amount = Number(t.amount) || 0;
        const paid = Number(t.paidAmount) || 0;
        return {
          id: t.id,
          description: t.itemName || t.description,
          totalAmount: amount,
          paidAmount: paid,
          pendingAmount: Math.max(0, amount - paid),
          date: t.date || t.createdAt,
        };
      })
      .filter(t => t.pendingAmount > 0)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [supplierTransactions]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const groups = [];
    let currentDate = null;

    // Create a flat list with both bills and payments
    const allItems = [];

    supplierTransactions.forEach(txn => {
      // Add the bill itself
      allItems.push({
        type: "bill",
        data: txn,
        date: txn.date || txn.createdAt,
        sortDate: new Date(txn.date || txn.createdAt),
      });

      // Add payments as separate items
      if (txn.payments && txn.payments.length > 0) {
        txn.payments.forEach(payment => {
          allItems.push({
            type: "payment",
            data: payment,
            parentTxn: txn,
            date: payment.date,
            sortDate: new Date(payment.date),
          });
        });
      }
    });

    // Sort by date
    allItems.sort((a, b) => a.sortDate - b.sortDate);

    // Group by date
    allItems.forEach(item => {
      const dateStr = new Date(item.date).toDateString();

      if (dateStr !== currentDate) {
        groups.push({
          type: "date",
          date: item.date,
        });
        currentDate = dateStr;
      }

      groups.push(item);
    });

    return groups;
  }, [supplierTransactions]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [groupedTransactions.length]);

  // Handlers
  const handleBack = () => {
    haptics.light();
    router.back();
  };

  const handleCall = () => {
    if (supplier?.phone) {
      window.location.href = `tel:${supplier.phone}`;
    }
  };

  const handleAddBill = () => {
    haptics.light();
    if (!isOnline) {
      toast.error("Cannot add while offline");
      return;
    }
    setTransactionToEdit(null);
    setTransactionFormOpen(true);
  };

  const handleEditBill = txn => {
    haptics.light();
    if (!isOnline) {
      toast.error("Cannot edit while offline");
      return;
    }
    setTransactionToEdit(txn);
    setTransactionFormOpen(true);
  };

  const handleDeleteBill = txn => {
    haptics.light();
    if (!isOnline) {
      toast.error("Cannot delete while offline");
      return;
    }
    setTransactionToDelete(txn);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
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

  const handleSubmitTransaction = async data => {
    if (transactionToEdit) {
      const result = await updateTransaction(transactionToEdit.id, data);
      if (result.success) {
        toast.success("Transaction updated");
        setTransactionToEdit(null);
      } else {
        toast.error("Failed to update transaction");
      }
    } else {
      const result = await addTransaction({ ...data, supplierId: id });
      if (result.success) {
        toast.success("Bill added");
      } else {
        toast.error("Failed to add bill");
      }
    }
  };

  const handleViewImages = (images, initialIndex = 0) => {
    setGalleryImages(images.map(img => resolveImageUrl(img)));
    setGalleryInitialIndex(initialIndex);
    setGalleryOpen(true);
  };

  const handleLumpsumPay = async (payments) => {
    for (const payment of payments) {
      const result = await recordPayment(
        payment.id,
        payment.amount,
        payment.receiptUrls,
        null,
        payment.notes,
        false
      );
      if (!result.success) {
        toast.error(`Failed to record payment for one of the bills`);
        throw new Error(result.error || "Payment failed");
      }
    }
  };

  const handleBubbleClick = (item, type = "bill") => {
    haptics.light();
    setSelectedBillItem(item);
    setSelectedBillType(type);
    setBillDrawerOpen(true);
  };

  // Menu items for header
  const menuItems = [
    {
      label: "View Profile",
      onClick: () => setProfileOpen(true),
    },
    {
      label: "Export PDF",
      icon: FileText,
      onClick: () => toast.info("Export feature coming soon"),
    },
    {
      label: "Delete Supplier",
      icon: Trash2,
      destructive: true,
      onClick: () => {
        if (!isOnline) {
          toast.error("Cannot delete while offline");
          return;
        }
        // TODO: Add delete confirmation
        toast.info("Delete confirmation coming soon");
      },
    },
  ];

  if (!supplier) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Supplier not found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-screen w-full max-w-4xl flex-col bg-background">
      {/* Header */}
      <ChatHeader
        name={supplier.companyName || supplier.name}
        subtitle={supplier.phone}
        image={supplier.profilePicture}
        onBack={handleBack}
        onCall={supplier.phone ? handleCall : undefined}
        onProfileClick={() => setProfileOpen(true)}
        menuItems={menuItems}
      />

      {/* Payment Progress - Fixed */}
      <PaymentProgress
        totalAmount={totals.total}
        paidAmount={totals.paid}
        label="Payment Progress"
      />

      {/* Chat Messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-4">
        {groupedTransactions.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="mb-2 text-muted-foreground">No transactions yet</p>
            <p className="text-sm text-muted-foreground">Add your first bill to start tracking</p>
          </div>
        ) : (
          groupedTransactions.map((item, index) => {
            if (item.type === "date") {
              return <DateSeparator key={`date-${item.date}`} date={item.date} showTime={false} />;
            }

            if (item.type === "payment") {
              return (
                <ChatBubble
                  key={`payment-${item.data.id || index}`}
                  type="payment"
                  amount={item.data.amount}
                  date={item.data.date}
                  status="paid"
                  paymentMethod={item.data.mode}
                  notes={item.data.notes}
                  hasImages={!!item.data.receiptUrl}
                  onClick={() => handleBubbleClick(item.data, "payment")}
                />
              );
            }

            // Bill bubble
            const txn = item.data;
            const paidAmount = txn.paidAmount || 0;

            return (
              <ChatBubble
                key={txn.id}
                type="bill"
                amount={txn.amount}
                description={txn.itemName || txn.description}
                date={txn.date}
                status={txn.paymentStatus}
                paidAmount={paidAmount}
                hasImages={txn.billImages?.length > 0}
                imageCount={txn.billImages?.length || 0}
                notes={txn.notes}
                onClick={() => handleBubbleClick(txn, "bill")}
              />
            );
          })
        )}
      </div>

      {/* Quick Action Bar */}
      <QuickActionBar
        primaryAction="Add Bill"
        onPrimaryAction={handleAddBill}
        showInput={false}
        disabled={!isOnline}
        className="mx-auto w-full max-w-4xl"
      >
        <LumpsumPaymentDrawer
          type="supplier"
          totalPending={totals.pending}
          pendingItems={pendingItems}
          onPayBills={handleLumpsumPay}
          disabled={!isOnline}
        />
      </QuickActionBar>

      {/* Profile Sheet */}
      <ProfileSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
        person={supplier}
        type="supplier"
        totalAmount={totals.total}
        paidAmount={totals.paid}
        pendingAmount={totals.pending}
        onEdit={() => {
          setProfileOpen(false);
          // TODO: Open edit form
        }}
      />

      {/* Transaction Form */}
      <TransactionForm
        open={transactionFormOpen}
        onOpenChange={open => {
          setTransactionFormOpen(open);
          if (!open) setTransactionToEdit(null);
        }}
        onSubmit={handleSubmitTransaction}
        suppliers={suppliers}
        initialData={transactionToEdit}
        defaultSupplierId={id}
        title={transactionToEdit ? "Edit Bill" : "Add Bill"}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Transaction"
        description="This action cannot be undone."
        itemName={transactionToDelete ? `₹${transactionToDelete.amount?.toLocaleString()}` : ""}
      />

      {/* Bill Detail Drawer */}
      <DragCloseDrawer
        open={billDrawerOpen}
        onOpenChange={(val) => {
          if (!val && galleryOpen) return;
          setBillDrawerOpen(val);
        }}
        height="h-[85vh]"
      >
        {selectedBillItem && selectedBillType === "bill" && (() => {
          const txn = selectedBillItem;
          const txnAmount = Number(txn.amount) || 0;
          const paidAmt = Number(txn.paidAmount) || 0;
          const pendingAmt = Math.max(0, txnAmount - paidAmt);
          const isPaid = txn.paymentStatus === "paid";
          const isPartial = txn.paymentStatus === "partial";
          const billImages = txn.billImages || [];

          return (
            <div className="space-y-4 pb-8">
              {billImages.length > 0 && (
                <SwipeCarousel
                  images={billImages.map(img => resolveImageUrl(img))}
                  autoPlay={false}
                  aspectRatio="aspect-[4/3]"
                  showGradientEdges={false}
                  onImageClick={(img, idx) => handleViewImages(billImages, idx)}
                />
              )}

              {!billImages.length && (
                <div className="flex items-center justify-center rounded-xl bg-muted/30 py-8">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Receipt className="h-10 w-10 opacity-50" />
                    <span className="text-xs">No bill photos</span>
                  </div>
                </div>
              )}

              <div className="space-y-3 px-1">
                <div className="text-center">
                  <p className="font-mono text-3xl font-bold tracking-tight">
                    ₹{txnAmount.toLocaleString("en-IN")}
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    {isPaid ? (
                      <Badge className="badge-paid gap-1 border-0">
                        <CheckCircle2 className="h-3 w-3" /> Paid
                      </Badge>
                    ) : isPartial ? (
                      <Badge className="gap-1 border-0 bg-blue-500/20 text-blue-600 dark:text-blue-400">
                        <Clock className="h-3 w-3" /> ₹{pendingAmt.toLocaleString("en-IN")} pending
                      </Badge>
                    ) : (
                      <Badge className="badge-pending gap-1 border-0">
                        <Clock className="h-3 w-3" /> Pending
                      </Badge>
                    )}
                  </div>
                </div>

                {(txn.itemName || txn.description || txn.notes) && (
                  <div className="rounded-xl bg-muted/30 p-3">
                    {(txn.itemName || txn.description) && (
                      <p className="text-sm font-medium">{txn.itemName || txn.description}</p>
                    )}
                    {txn.notes && (
                      <p className="mt-1 text-xs italic text-muted-foreground">&quot;{txn.notes}&quot;</p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3 text-sm">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">
                    {txn.date
                      ? new Date(txn.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </span>
                </div>

                {paidAmt > 0 && (
                  <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3 text-sm">
                    <span className="text-muted-foreground">Paid</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      ₹{paidAmt.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5"
                    onClick={() => { setBillDrawerOpen(false); handleEditBill(txn); }}
                  >
                    <Edit className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1.5"
                    onClick={() => { setBillDrawerOpen(false); handleDeleteBill(txn); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}

        {selectedBillItem && selectedBillType === "payment" && (() => {
          const payment = selectedBillItem;
          const receiptImages = payment.receiptUrl ? [payment.receiptUrl] : [];

          return (
            <div className="space-y-4 pb-8">
              {receiptImages.length > 0 && (
                <SwipeCarousel
                  images={receiptImages.map(img => resolveImageUrl(img))}
                  autoPlay={false}
                  aspectRatio="aspect-[4/3]"
                  showGradientEdges={false}
                  onImageClick={(img, idx) => handleViewImages(receiptImages, idx)}
                />
              )}

              {!receiptImages.length && (
                <div className="flex items-center justify-center rounded-xl bg-muted/30 py-8">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Receipt className="h-10 w-10 opacity-50" />
                    <span className="text-xs">No receipt photo</span>
                  </div>
                </div>
              )}

              <div className="space-y-3 px-1">
                <div className="text-center">
                  <p className="font-mono text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                    +₹{payment.amount?.toLocaleString("en-IN")}
                  </p>
                  <Badge className="mt-2 badge-paid gap-1 border-0">
                    <CheckCircle2 className="h-3 w-3" /> Payment Made
                  </Badge>
                </div>

                {payment.notes && (
                  <div className="rounded-xl bg-muted/30 p-3">
                    <p className="text-xs italic text-muted-foreground">&quot;{payment.notes}&quot;</p>
                  </div>
                )}

                {payment.mode && (
                  <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3 text-sm">
                    <span className="text-muted-foreground">Method</span>
                    <span className="font-medium">{payment.mode}</span>
                  </div>
                )}

                <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3 text-sm">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">
                    {payment.date
                      ? new Date(payment.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
      </DragCloseDrawer>

      {/* Image Gallery */}
      <ImageGalleryViewer
        images={galleryImages}
        initialIndex={galleryInitialIndex}
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
      />
    </div>
  );
}
