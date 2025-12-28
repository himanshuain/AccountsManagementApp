"use client";

import { use, useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Edit, Trash2, FileText, Image as ImageIcon, Plus, Check } from "lucide-react";
import useCustomers from "@/hooks/useCustomers";
import useUdhar from "@/hooks/useUdhar";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { UdharForm } from "@/components/UdharForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { ImageGalleryViewer } from "@/components/ImageViewer";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/gpay";

export default function CustomerChatPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const chatContainerRef = useRef(null);
  
  const { customers, updateCustomer, deleteCustomer, addCustomer } = useCustomers();
  const { 
    udharList, 
    addUdhar, 
    updateUdhar, 
    deleteUdhar,
    recordDeposit,
    markFullPaid,
    deletePayment,
  } = useUdhar();

  // State
  const [profileOpen, setProfileOpen] = useState(false);
  const [udharFormOpen, setUdharFormOpen] = useState(false);
  const [udharToEdit, setUdharToEdit] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [udharToDelete, setUdharToDelete] = useState(null);
  const [expandedBubbleId, setExpandedBubbleId] = useState(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
  
  // Collect payment sheet
  const [collectSheetOpen, setCollectSheetOpen] = useState(false);
  const [collectUdhar, setCollectUdhar] = useState(null);
  const [collectAmount, setCollectAmount] = useState("");

  // Get customer
  const customer = useMemo(() => {
    return customers.find(c => c.id === id);
  }, [customers, id]);

  // Get customer's udhar
  const customerUdhars = useMemo(() => {
    return udharList
      .filter(u => u.customerId === id)
      .sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));
  }, [udharList, id]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalAmount = customerUdhars.reduce((sum, u) => {
      return sum + (u.amount || (u.cashAmount || 0) + (u.onlineAmount || 0));
    }, 0);
    const paidAmount = customerUdhars.reduce((sum, u) => {
      return sum + (u.paidAmount || (u.paidCash || 0) + (u.paidOnline || 0));
    }, 0);
    return {
      total: totalAmount,
      paid: paidAmount,
      pending: Math.max(0, totalAmount - paidAmount),
    };
  }, [customerUdhars]);

  // Group transactions by date
  const groupedItems = useMemo(() => {
    const groups = [];
    let currentDate = null;
    
    // Create a flat list with both udhars and payments
    const allItems = [];
    
    customerUdhars.forEach(udhar => {
      const udharAmount = udhar.amount || (udhar.cashAmount || 0) + (udhar.onlineAmount || 0);
      
      // Add the udhar itself
      allItems.push({
        type: "udhar",
        data: udhar,
        amount: udharAmount,
        date: udhar.date || udhar.createdAt,
        sortDate: new Date(udhar.date || udhar.createdAt),
      });
      
      // Add payments as separate items
      if (udhar.payments && udhar.payments.length > 0) {
        udhar.payments.forEach(payment => {
          allItems.push({
            type: "payment",
            data: payment,
            parentUdhar: udhar,
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
  }, [customerUdhars]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [groupedItems.length]);

  // Handlers
  const handleBack = () => {
    haptics.light();
    router.back();
  };

  const handleCall = () => {
    if (customer?.phone) {
      window.location.href = `tel:${customer.phone}`;
    }
  };

  const handleAddUdhar = () => {
    haptics.light();
    if (!isOnline) {
      toast.error("Cannot add while offline");
      return;
    }
    setUdharToEdit(null);
    setUdharFormOpen(true);
  };

  const handleEditUdhar = (udhar) => {
    haptics.light();
    if (!isOnline) {
      toast.error("Cannot edit while offline");
      return;
    }
    setUdharToEdit(udhar);
    setUdharFormOpen(true);
  };

  const handleDeleteUdhar = (udhar) => {
    haptics.light();
    if (!isOnline) {
      toast.error("Cannot delete while offline");
      return;
    }
    setUdharToDelete(udhar);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (udharToDelete) {
      const result = await deleteUdhar(udharToDelete.id);
      if (result.success) {
        toast.success("Udhar deleted");
      } else {
        toast.error("Failed to delete udhar");
      }
      setUdharToDelete(null);
    }
  };

  const handleSubmitUdhar = async (data) => {
    if (udharToEdit) {
      const result = await updateUdhar(udharToEdit.id, data);
      if (result.success) {
        toast.success("Udhar updated");
        setUdharToEdit(null);
      } else {
        toast.error("Failed to update udhar");
      }
    } else {
      const result = await addUdhar({ ...data, customerId: id });
      if (result.success) {
        toast.success("Udhar added");
      } else {
        toast.error("Failed to add udhar");
      }
    }
  };

  const handleCollectPayment = (udhar) => {
    haptics.light();
    if (!isOnline) {
      toast.error("Cannot collect while offline");
      return;
    }
    setCollectUdhar(udhar);
    setCollectAmount("");
    setCollectSheetOpen(true);
  };

  const handleSubmitCollect = async () => {
    if (!collectUdhar || !collectAmount) return;
    
    const amount = Number(collectAmount);
    const udharAmount = collectUdhar.amount || (collectUdhar.cashAmount || 0) + (collectUdhar.onlineAmount || 0);
    const paidAmount = collectUdhar.paidAmount || (collectUdhar.paidCash || 0) + (collectUdhar.paidOnline || 0);
    const pendingAmount = udharAmount - paidAmount;
    
    if (amount > pendingAmount) {
      toast.error(`Cannot collect more than ₹${pendingAmount.toLocaleString()}`);
      return;
    }
    
    const result = await recordDeposit(collectUdhar.id, amount, null, null);
    if (result?.success) {
      toast.success("Payment collected!");
      setCollectSheetOpen(false);
      setCollectUdhar(null);
    } else {
      toast.error("Failed to record payment");
    }
  };

  const handleMarkFullPaid = async (udhar) => {
    haptics.light();
    if (!isOnline) {
      toast.error("Cannot update while offline");
      return;
    }
    const result = await markFullPaid(udhar.id);
    if (result?.success) {
      toast.success("Marked as fully paid!");
    } else {
      toast.error("Failed to update");
    }
  };

  const handleViewImages = (images, initialIndex = 0) => {
    setGalleryImages(images.map(img => resolveImageUrl(img)));
    setGalleryInitialIndex(initialIndex);
    setGalleryOpen(true);
  };

  const handleBubbleClick = (udhar) => {
    haptics.light();
    setExpandedBubbleId(expandedBubbleId === udhar.id ? null : udhar.id);
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
      label: "Delete Customer",
      icon: Trash2,
      destructive: true,
      onClick: () => {
        if (!isOnline) {
          toast.error("Cannot delete while offline");
          return;
        }
        toast.info("Delete confirmation coming soon");
      },
    },
  ];

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Customer not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background w-full max-w-4xl mx-auto">
      {/* Header */}
      <ChatHeader
        name={customer.name}
        subtitle={customer.phone}
        image={customer.profilePicture}
        onBack={handleBack}
        onCall={customer.phone ? handleCall : undefined}
        onProfileClick={() => setProfileOpen(true)}
        menuItems={menuItems}
      />

      {/* Payment Progress - Fixed */}
      <PaymentProgress
        totalAmount={totals.total}
        paidAmount={totals.paid}
        label="Udhar Progress"
      />

      {/* Chat Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {groupedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground mb-2">No udhar records yet</p>
            <p className="text-sm text-muted-foreground">
              Add your first udhar to start tracking
            </p>
          </div>
        ) : (
          groupedItems.map((item, index) => {
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
                  notes={item.data.notes}
                  hasImages={!!item.data.receiptUrl}
                  onClick={item.data.receiptUrl ? () => handleViewImages([item.data.receiptUrl]) : undefined}
                />
              );
            }
            
            // Udhar bubble
            const udhar = item.data;
            const isExpanded = expandedBubbleId === udhar.id;
            const udharAmount = item.amount;
            const paidAmount = udhar.paidAmount || (udhar.paidCash || 0) + (udhar.paidOnline || 0);
            const isPaid = udhar.paymentStatus === "paid";
            const allImages = [...(udhar.khataPhotos || []), ...(udhar.billImages || [])];
            
            return (
              <div key={udhar.id} className="mb-2">
                <ChatBubble
                  type="bill"
                  amount={udharAmount}
                  description={udhar.description || udhar.notes}
                  date={udhar.date}
                  status={udhar.paymentStatus}
                  paidAmount={paidAmount}
                  hasImages={allImages.length > 0}
                  imageCount={allImages.length}
                  notes={udhar.notes}
                  onClick={() => handleBubbleClick(udhar)}
                />
                
                {/* Expanded Actions */}
                {isExpanded && (
                  <div className="flex justify-end gap-2 mb-4 mt-1 animate-fade-in flex-wrap">
                    {!isPaid && (
                      <>
                        <button
                          onClick={() => handleCollectPayment(udhar)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-medium"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Collect
                        </button>
                        <button
                          onClick={() => handleMarkFullPaid(udhar)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-600 text-xs font-medium"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Full Paid
                        </button>
                      </>
                    )}
                    {allImages.length > 0 && (
                      <button
                        onClick={() => handleViewImages(allImages)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted text-xs font-medium"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        Photos
                      </button>
                    )}
                    <button
                      onClick={() => handleEditUdhar(udhar)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted text-xs font-medium"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteUdhar(udhar)}
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
        primaryAction="Add Udhar"
        onPrimaryAction={handleAddUdhar}
        showInput={false}
        disabled={!isOnline}
        className="max-w-4xl mx-auto w-full"
      />

      {/* Profile Sheet */}
      <ProfileSheet
        open={profileOpen}
        onOpenChange={setProfileOpen}
        person={customer}
        type="customer"
        totalAmount={totals.total}
        paidAmount={totals.paid}
        pendingAmount={totals.pending}
        onEdit={() => {
          setProfileOpen(false);
          // TODO: Open edit form
        }}
      />

      {/* Udhar Form */}
      <UdharForm
        open={udharFormOpen}
        onOpenChange={(open) => {
          setUdharFormOpen(open);
          if (!open) setUdharToEdit(null);
        }}
        onSubmit={handleSubmitUdhar}
        onAddCustomer={addCustomer}
        customers={customers}
        initialData={udharToEdit}
        defaultCustomerId={id}
        title={udharToEdit ? "Edit Udhar" : "Add Udhar"}
      />

      {/* Collect Payment Sheet */}
      <Sheet open={collectSheetOpen} onOpenChange={setCollectSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl" hideClose>
          <SheetHeader className="pb-4">
            <SheetTitle>Collect Payment</SheetTitle>
          </SheetHeader>
          
          {collectUdhar && (
            <div className="space-y-4 pb-6">
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-sm text-muted-foreground">Pending Amount</p>
                <p className="text-2xl font-bold text-amber-500">
                  ₹{(
                    (collectUdhar.amount || (collectUdhar.cashAmount || 0) + (collectUdhar.onlineAmount || 0)) -
                    (collectUdhar.paidAmount || (collectUdhar.paidCash || 0) + (collectUdhar.paidOnline || 0))
                  ).toLocaleString()}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Amount to Collect (₹)</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="h-14 text-xl font-semibold text-center"
                  autoFocus
                />
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={() => setCollectSheetOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-12"
                  onClick={handleSubmitCollect}
                  disabled={!collectAmount || Number(collectAmount) <= 0}
                >
                  Collect ₹{Number(collectAmount || 0).toLocaleString()}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Udhar"
        description="This action cannot be undone."
        itemName={udharToDelete ? `₹${(udharToDelete.amount || (udharToDelete.cashAmount || 0) + (udharToDelete.onlineAmount || 0))?.toLocaleString()}` : ""}
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

