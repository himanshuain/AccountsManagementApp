"use client";

import { use, useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Edit, Trash2, FileText, Image as ImageIcon } from "lucide-react";
import useSuppliers from "@/hooks/useSuppliers";
import useTransactions from "@/hooks/useTransactions";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { TransactionForm } from "@/components/TransactionForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { ImageGalleryViewer } from "@/components/PhotoViewer";
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
  } = useTransactions();

  // State
  const [profileOpen, setProfileOpen] = useState(false);
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [expandedBubbleId, setExpandedBubbleId] = useState(null);
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

  const handleEditBill = (txn) => {
    haptics.light();
    if (!isOnline) {
      toast.error("Cannot edit while offline");
      return;
    }
    setTransactionToEdit(txn);
    setTransactionFormOpen(true);
  };

  const handleDeleteBill = (txn) => {
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

  const handleSubmitTransaction = async (data) => {
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

  const handleBubbleClick = (txn) => {
    haptics.light();
    setExpandedBubbleId(expandedBubbleId === txn.id ? null : txn.id);
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
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Supplier not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background w-full max-w-4xl mx-auto">
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
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {groupedTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground mb-2">No transactions yet</p>
            <p className="text-sm text-muted-foreground">
              Add your first bill to start tracking
            </p>
          </div>
        ) : (
          groupedTransactions.map((item, index) => {
            if (item.type === "date") {
              return (
                <DateSeparator
                  key={`date-${item.date}`}
                  date={item.date}
                  showTime={false}
                />
              );
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
                  onClick={item.data.receiptUrl ? () => handleViewImages([item.data.receiptUrl]) : undefined}
                />
              );
            }
            
            // Bill bubble
            const txn = item.data;
            const isExpanded = expandedBubbleId === txn.id;
            const paidAmount = txn.paidAmount || 0;
            
            return (
              <div key={txn.id} className="mb-2">
                <ChatBubble
                  type="bill"
                  amount={txn.amount}
                  description={txn.itemName || txn.description}
                  date={txn.date}
                  status={txn.paymentStatus}
                  paidAmount={paidAmount}
                  hasImages={txn.billImages?.length > 0}
                  imageCount={txn.billImages?.length || 0}
                  notes={txn.notes}
                  onClick={() => handleBubbleClick(txn)}
                />
                
                {/* Expanded Actions */}
                {isExpanded && (
                  <div className="flex justify-end gap-2 mb-4 mt-1 animate-fade-in">
                    {txn.billImages?.length > 0 && (
                      <button
                        onClick={() => handleViewImages(txn.billImages)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted text-xs font-medium"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        Photos
                      </button>
                    )}
                    <button
                      onClick={() => handleEditBill(txn)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted text-xs font-medium"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteBill(txn)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
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
        className="max-w-4xl mx-auto w-full"
      />

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
        onOpenChange={(open) => {
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

