"use client";

import { use, useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Edit, Trash2, FileText, Image as ImageIcon, Plus, Check, CheckCircle2, Clock, Receipt } from "lucide-react";
import useCustomers from "@/hooks/useCustomers";
import useUdhar from "@/hooks/useUdhar";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { UdharForm } from "@/components/UdharForm";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { ImageGalleryViewer } from "@/components/PhotoViewer";
import { DragCloseDrawer, DrawerHeader, DrawerTitle } from "@/components/ui/drag-close-drawer";
import { SwipeCarousel } from "@/components/ui/swipe-carousel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  LumpsumPaymentDrawer,
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
  } = useUdhar({ fetchAll: true });

  // State
  const [profileOpen, setProfileOpen] = useState(false);
  const [udharFormOpen, setUdharFormOpen] = useState(false);
  const [udharToEdit, setUdharToEdit] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [udharToDelete, setUdharToDelete] = useState(null);
  const [billDrawerOpen, setBillDrawerOpen] = useState(false);
  const [selectedBillItem, setSelectedBillItem] = useState(null);
  const [selectedBillType, setSelectedBillType] = useState(null);
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

  // Pending items sorted earliest first (for lumpsum payment)
  const pendingItems = useMemo(() => {
    return customerUdhars
      .filter(u => u.paymentStatus !== "paid")
      .map(u => {
        const amount = u.amount || (u.cashAmount || 0) + (u.onlineAmount || 0);
        const paid = u.paidAmount || (u.paidCash || 0) + (u.paidOnline || 0);
        return {
          id: u.id,
          description: u.description || u.notes || u.itemDescription,
          totalAmount: amount,
          paidAmount: paid,
          pendingAmount: Math.max(0, amount - paid),
          date: u.date || u.createdAt,
        };
      })
      .filter(u => u.pendingAmount > 0)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
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

  const handleEditUdhar = udhar => {
    haptics.light();
    if (!isOnline) {
      toast.error("Cannot edit while offline");
      return;
    }
    setUdharToEdit(udhar);
    setUdharFormOpen(true);
  };

  const handleDeleteUdhar = udhar => {
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

  const handleSubmitUdhar = async data => {
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

  const handleCollectPayment = udhar => {
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
    const udharAmount =
      collectUdhar.amount || (collectUdhar.cashAmount || 0) + (collectUdhar.onlineAmount || 0);
    const paidAmount =
      collectUdhar.paidAmount || (collectUdhar.paidCash || 0) + (collectUdhar.paidOnline || 0);
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

  const handleMarkFullPaid = async udhar => {
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

  const handleLumpsumPay = async (payments) => {
    for (const payment of payments) {
      const result = await recordDeposit(
        payment.id,
        payment.amount,
        payment.receiptUrls,
        payment.notes,
        null,
        false
      );
      if (!result?.success) {
        toast.error(`Failed to record payment for one of the udhars`);
        throw new Error(result?.error || "Payment failed");
      }
    }
  };

  const handleBubbleClick = (item, type = "udhar") => {
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
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Customer not found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-screen w-full max-w-4xl flex-col bg-background">
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
      <PaymentProgress totalAmount={totals.total} paidAmount={totals.paid} label="Udhar Progress" />

      {/* Chat Messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-4">
        {groupedItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="mb-2 text-muted-foreground">No udhar records yet</p>
            <p className="text-sm text-muted-foreground">Add your first udhar to start tracking</p>
          </div>
        ) : (
          groupedItems.map((item, index) => {
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
                  notes={item.data.notes}
                  hasImages={!!item.data.receiptUrl}
                  onClick={() => handleBubbleClick(item.data, "payment")}
                />
              );
            }

            // Udhar bubble
            const udhar = item.data;
            const udharAmount = item.amount;
            const paidAmount = udhar.paidAmount || (udhar.paidCash || 0) + (udhar.paidOnline || 0);
            const allImages = [...(udhar.khataPhotos || []), ...(udhar.billImages || [])];

            return (
              <ChatBubble
                key={udhar.id}
                type="bill"
                amount={udharAmount}
                description={udhar.description || udhar.notes}
                date={udhar.date}
                status={udhar.paymentStatus}
                paidAmount={paidAmount}
                hasImages={allImages.length > 0}
                imageCount={allImages.length}
                notes={udhar.notes}
                onClick={() => handleBubbleClick(udhar, "udhar")}
              />
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
        className="mx-auto w-full max-w-4xl"
      >
        <LumpsumPaymentDrawer
          type="customer"
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
        onOpenChange={open => {
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

      {/* Collect Payment Drawer */}
      <DragCloseDrawer
        open={collectSheetOpen}
        onOpenChange={setCollectSheetOpen}
        height="h-[85vh]"
      >
        <DrawerHeader className="pb-4">
          <DrawerTitle>Collect Payment</DrawerTitle>
        </DrawerHeader>

        {collectUdhar && (
            <div className="space-y-4 pb-6">
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Pending Amount</p>
                <p className="text-2xl font-bold text-amber-500">
                  ₹
                  {(
                    (collectUdhar.amount ||
                      (collectUdhar.cashAmount || 0) + (collectUdhar.onlineAmount || 0)) -
                    (collectUdhar.paidAmount ||
                      (collectUdhar.paidCash || 0) + (collectUdhar.paidOnline || 0))
                  ).toLocaleString()}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Amount to Collect (₹)</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={collectAmount}
                  onChange={e => setCollectAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="h-14 text-center text-xl font-semibold"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="h-12 flex-1"
                  onClick={() => setCollectSheetOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="h-12 flex-1"
                  onClick={handleSubmitCollect}
                  disabled={!collectAmount || Number(collectAmount) <= 0}
                >
                  Collect ₹{Number(collectAmount || 0).toLocaleString()}
                </Button>
              </div>
            </div>
          )}
      </DragCloseDrawer>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title="Delete Udhar"
        description="This action cannot be undone."
        itemName={
          udharToDelete
            ? `₹${(udharToDelete.amount || (udharToDelete.cashAmount || 0) + (udharToDelete.onlineAmount || 0))?.toLocaleString()}`
            : ""
        }
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
        {selectedBillItem && selectedBillType === "udhar" && (() => {
          const udhar = selectedBillItem;
          const udharAmount = udhar.amount || (udhar.cashAmount || 0) + (udhar.onlineAmount || 0);
          const paidAmt = udhar.paidAmount || (udhar.paidCash || 0) + (udhar.paidOnline || 0);
          const pendingAmt = Math.max(0, udharAmount - paidAmt);
          const isPaid = udhar.paymentStatus === "paid";
          const isPartial = udhar.paymentStatus === "partial";
          const allImages = [...(udhar.khataPhotos || []), ...(udhar.billImages || [])];

          return (
            <div className="space-y-4 pb-8">
              {allImages.length > 0 && (
                <SwipeCarousel
                  images={allImages.map(img => resolveImageUrl(img))}
                  autoPlay={false}
                  aspectRatio="aspect-[4/3]"
                  showGradientEdges={false}
                  onImageClick={(img, idx) => handleViewImages(allImages, idx)}
                />
              )}

              {!allImages.length && (
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
                    ₹{udharAmount.toLocaleString("en-IN")}
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

                {(udhar.description || udhar.notes) && (
                  <div className="rounded-xl bg-muted/30 p-3">
                    {udhar.description && (
                      <p className="text-sm font-medium">{udhar.description}</p>
                    )}
                    {udhar.notes && (
                      <p className="mt-1 text-xs italic text-muted-foreground">&quot;{udhar.notes}&quot;</p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3 text-sm">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">
                    {udhar.date
                      ? new Date(udhar.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
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
                  {!isPaid && (
                    <>
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => { setBillDrawerOpen(false); handleCollectPayment(udhar); }}
                      >
                        <Plus className="h-3.5 w-3.5" /> Collect
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1.5"
                        onClick={() => { setBillDrawerOpen(false); handleMarkFullPaid(udhar); }}
                      >
                        <Check className="h-3.5 w-3.5" /> Full Paid
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => { setBillDrawerOpen(false); handleEditUdhar(udhar); }}
                  >
                    <Edit className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1.5"
                    onClick={() => { setBillDrawerOpen(false); handleDeleteUdhar(udhar); }}
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
                    <CheckCircle2 className="h-3 w-3" /> Payment Received
                  </Badge>
                </div>

                {payment.notes && (
                  <div className="rounded-xl bg-muted/30 p-3">
                    <p className="text-xs italic text-muted-foreground">&quot;{payment.notes}&quot;</p>
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
