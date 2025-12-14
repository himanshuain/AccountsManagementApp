"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Trash2,
  Image as ImageIcon,
  Calendar,
  User,
  Check,
  Plus,
  IndianRupee,
  ChevronDown,
  Receipt,
  X,
  Camera,
  ImagePlus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useProgressiveList, LoadMoreTrigger } from "@/hooks/useProgressiveList";
import { compressImage } from "@/lib/image-compression";
import { ImageViewer } from "./ImageViewer";

export function UdharList({
  udharList,
  customers,
  onEdit,
  onDelete,
  onDeposit,
  onFullPaid,
  onDeletePayment,
  showCustomer = true,
  loading = false,
}) {
  const [selectedImages, setSelectedImages] = useState([]);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [udharToDelete, setUdharToDelete] = useState(null);
  const [depositSheetOpen, setDepositSheetOpen] = useState(false);
  const [udharForDeposit, setUdharForDeposit] = useState(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositNotes, setDepositNotes] = useState("");
  const [depositReceipts, setDepositReceipts] = useState([]);
  const [pendingReceiptFiles, setPendingReceiptFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [deletePaymentDialogOpen, setDeletePaymentDialogOpen] = useState(false);
  const [receiptViewerOpen, setReceiptViewerOpen] = useState(false);
  const [receiptViewerSrc, setReceiptViewerSrc] = useState("");

  const receiptCameraRef = useRef(null);
  const receiptGalleryRef = useRef(null);

  const getCustomer = customerId => {
    return customers?.find(c => c.id === customerId);
  };

  const getCustomerName = customerId => {
    const customer = getCustomer(customerId);
    return customer?.name || "Unknown";
  };

  const getUdharAmount = udhar => {
    return udhar.amount || (udhar.cashAmount || 0) + (udhar.onlineAmount || 0);
  };

  const getPaidAmount = udhar => {
    return udhar.paidAmount || (udhar.paidCash || 0) + (udhar.paidOnline || 0);
  };

  const toggleExpanded = id => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const handleViewImages = (images, e) => {
    e.stopPropagation();
    setSelectedImages(images);
    setImageDialogOpen(true);
  };

  const handleDeleteClick = (udhar, e) => {
    e.stopPropagation();
    setUdharToDelete(udhar);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (udharToDelete) {
      onDelete?.(udharToDelete);
    }
    setDeleteDialogOpen(false);
    setUdharToDelete(null);
  };

  const handleDepositClick = (udhar, e) => {
    e.stopPropagation();
    setUdharForDeposit(udhar);
    setDepositAmount("");
    setDepositNotes("");
    setDepositReceipts([]);
    setPendingReceiptFiles([]);
    setDepositSheetOpen(true);
  };

  const handleFullPaidClick = async (udhar, e) => {
    e.stopPropagation();
    setIsSubmitting(true);
    try {
      await onFullPaid?.(udhar.id);
      toast.success("Marked as fully paid!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceiptSelect = async (e, isCamera = false) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPreviews = [];
    const newPending = [];

    for (const file of files) {
      try {
        const compressed = await compressImage(file);
        const preview = URL.createObjectURL(compressed);
        newPreviews.push(preview);
        newPending.push(compressed);
      } catch (error) {
        console.error("Error processing image:", error);
      }
    }

    setDepositReceipts(prev => [...prev, ...newPreviews]);
    setPendingReceiptFiles(prev => [...prev, ...newPending]);
    e.target.value = "";
  };

  const handleRemoveReceipt = index => {
    setDepositReceipts(prev => prev.filter((_, i) => i !== index));
    setPendingReceiptFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetDepositForm = () => {
    setDepositSheetOpen(false);
    setUdharForDeposit(null);
    setDepositAmount("");
    setDepositNotes("");
    setDepositReceipts([]);
    setPendingReceiptFiles([]);
  };

  const handleDepositSubmit = async () => {
    if (!depositAmount || Number(depositAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload receipt if any
      let receiptUrl = null;
      if (pendingReceiptFiles.length > 0) {
        const formData = new FormData();
        formData.append("file", pendingReceiptFiles[0]);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          receiptUrl = uploadData.url;
        }
      }

      await onDeposit?.(
        udharForDeposit.id,
        Number(depositAmount),
        receiptUrl,
        depositNotes || null
      );
      toast.success("Collect recorded!");
      resetDepositForm();
    } catch (error) {
      console.error("Error recording deposit:", error);
      toast.error("Failed to record collect");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = udharList.reduce(
    (acc, u) => {
      const total = getUdharAmount(u);
      const paid = getPaidAmount(u);
      acc.total += total;
      acc.paid += paid;
      acc.pending += Math.max(0, total - paid);
      return acc;
    },
    { total: 0, paid: 0, pending: 0 }
  );

  const pendingUdhar = udharList
    .filter(u => u.paymentStatus !== "paid")
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const paidUdhar = udharList
    .filter(u => u.paymentStatus === "paid")
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const sortedUdhar = [...pendingUdhar, ...paidUdhar];

  // Progressive loading for large lists
  const {
    visibleItems: visibleUdhar,
    hasMore,
    loadMore,
    loadMoreRef,
    remainingCount,
  } = useProgressiveList(sortedUdhar, 15, 15);

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

  if (udharList.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No Udhar records found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
              <p className="text-xl font-bold">₹{totals.total.toLocaleString()}</p>
            </div>
            <div className="h-10 w-px bg-amber-500/20" />
            <div className="text-center flex-1">
              <p className="text-xs text-green-600 uppercase tracking-wide">Collected</p>
              <p className="text-xl font-bold text-green-600">₹{totals.paid.toLocaleString()}</p>
            </div>
            <div className="h-10 w-px bg-amber-500/20" />
            <div className="text-center flex-1">
              <p className="text-xs text-amber-600 uppercase tracking-wide">Pending</p>
              <p className="text-xl font-bold text-amber-600">₹{totals.pending.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Udhar List */}
      <div className="space-y-6">
        {visibleUdhar.map(udhar => {
          const totalAmount = getUdharAmount(udhar);
          const paidAmount = getPaidAmount(udhar);
          const pendingAmount = Math.max(0, totalAmount - paidAmount);
          const isPaid = udhar.paymentStatus === "paid";
          const isPartial = udhar.paymentStatus === "partial";
          const isExpanded = expandedItems.has(udhar.id);
          const payments = udhar.payments || [];

          return (
            <Collapsible
              key={udhar.id}
              open={isExpanded}
              onOpenChange={() => toggleExpanded(udhar.id)}
            >
              <Card
                className={cn(
                  "overflow-hidden transition-all",
                  isPaid
                    ? "border-l-4 border-l-green-500 opacity-75"
                    : isPartial
                    ? "border-l-4 border-l-blue-500"
                    : "border-l-4 border-l-amber-500",
                  isExpanded && "shadow-md bg-blue-800"
                )}
              >
                <CollapsibleTrigger asChild>
                  <CardContent className="p-3 cursor-pointer transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={cn(
                              "font-bold flex items-center gap-0.5",
                              totalAmount >= 10000 ? "text-lg" : "text-xl"
                            )}
                          >
                            <IndianRupee className="h-4 w-4" />
                            {totalAmount.toLocaleString()}
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs px-1.5 py-0",
                              isPaid
                                ? "bg-green-500/20 text-green-600"
                                : isPartial
                                ? "bg-blue-500/20 text-blue-600"
                                : "bg-amber-500/20 text-amber-600"
                            )}
                          >
                            {isPaid ? "Paid" : isPartial ? "Partial" : "Pending"}
                          </Badge>
                        </div>
                        {/* Customer with DP */}
                        {showCustomer &&
                          (() => {
                            const customer = getCustomer(udhar.customerId);
                            return (
                              <div className="flex items-center gap-2 mb-1">
                                <Link
                                  href={`/customers?open=${udhar.customerId}`}
                                  className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
                                  onClick={e => e.stopPropagation()}
                                >
                                  {customer?.profilePicture ? (
                                    <img
                                      src={customer.profilePicture}
                                      alt=""
                                      className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                                      <span className="text-xs font-semibold text-amber-600">
                                        {(customer?.name || "?").charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                  <span className="font-semibold text-sm truncate max-w-[120px]">
                                    {getCustomerName(udhar.customerId)}
                                  </span>
                                </Link>
                              </div>
                            );
                          })()}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(udhar.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "2-digit",
                            })}
                          </span>
                        </div>
                        {!isPaid && paidAmount > 0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            Remaining: ₹{pendingAmount.toLocaleString()}
                          </p>
                        )}
                      </div>
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 text-muted-foreground transition-transform",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </div>
                  </CardContent>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-3 pb-3 space-y-3">
                    {udhar.notes && (
                      <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
                        {udhar.notes}
                      </p>
                    )}

                    {/* Payment Timeline */}
                    {payments.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Payment History
                        </p>
                        <div className="relative pl-4 space-y-2">
                          <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-green-500/30" />
                          {payments.map((payment, idx) => (
                            <div
                              key={payment.id || idx}
                              className="relative flex items-start gap-2"
                            >
                              <div className="absolute left-[-13px] top-1 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background" />
                              <div className="flex-1 bg-green-500/10 rounded-lg p-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Check className="h-3.5 w-3.5 text-green-600" />
                                    <span className="text-sm font-medium text-green-600">
                                      ₹{payment.amount?.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>
                                      {new Date(payment.date).toLocaleDateString("en-IN", {
                                        day: "numeric",
                                        month: "short",
                                      })}
                                    </span>
                                    {payment.receiptUrl && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={e => handleViewImages([payment.receiptUrl], e)}
                                      >
                                        <Receipt className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                    {onDeletePayment && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                        onClick={e => {
                                          e.stopPropagation();
                                          setPaymentToDelete({
                                            udharId: udhar.id,
                                            paymentId: payment.id,
                                            amount: payment.amount,
                                          });
                                          setDeletePaymentDialogOpen(true);
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                {payment.notes && (
                                  <p className="text-xs text-muted-foreground mt-1 italic pl-5">
                                    &quot;{payment.notes}&quot;
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      {!isPaid && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={e => handleDepositClick(udhar, e)}
                            className="flex-1 h-9 text-xs gap-1 text-blue-600 border-blue-600/30 hover:bg-blue-50"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Collect
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={e => handleFullPaidClick(udhar, e)}
                            className="flex-1 h-9 text-xs gap-1 text-green-600 border-green-600/30 hover:bg-green-50"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Full Paid
                          </Button>
                        </>
                      )}
                      {udhar.khataPhotos?.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={e => handleViewImages(udhar.khataPhotos, e)}
                          className="h-9 px-3 text-xs gap-1"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          Photos
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={e => handleDeleteClick(udhar, e)}
                        className="h-9 px-3 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}

        {/* Load More Trigger */}
        <LoadMoreTrigger
          loadMoreRef={loadMoreRef}
          hasMore={hasMore}
          remainingCount={remainingCount}
          onLoadMore={loadMore}
        />
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Photos</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {selectedImages.map((url, index) => (
              <div key={index} className="aspect-square rounded-lg overflow-hidden bg-muted">
                <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Collect Sheet */}
      <Sheet
        open={depositSheetOpen}
        onOpenChange={open => {
          if (!open && !receiptViewerOpen) resetDepositForm();
          else setDepositSheetOpen(open);
        }}
      >
        <SheetContent side="top" className="h-auto max-h-[85vh] rounded-b-2xl p-0" hideClose>
          <SheetHeader className="p-4 border-b flex flex-row items-center justify-between">
            <SheetTitle>Record Collect</SheetTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={resetDepositForm}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDepositSubmit}
                disabled={isSubmitting || !depositAmount}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save
              </Button>
            </div>
          </SheetHeader>
          <ScrollArea className="max-h-[calc(85vh-60px)]">
            <div className="p-4 space-y-4">
              {/* Amount Summary */}
              {udharForDeposit && (
                <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Total Udhar: ₹{getUdharAmount(udharForDeposit).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Already Paid: ₹{getPaidAmount(udharForDeposit).toLocaleString()}
                  </p>
                  <p className="text-xs font-medium text-amber-600">
                    Remaining: ₹
                    {Math.max(
                      0,
                      getUdharAmount(udharForDeposit) - getPaidAmount(udharForDeposit)
                    ).toLocaleString()}
                  </p>
                </div>
              )}

              {/* Amount Input */}
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="text-xl h-14 font-semibold"
                  autoFocus
                />
              </div>

              {/* Notes Input */}
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={depositNotes}
                  onChange={e => setDepositNotes(e.target.value)}
                  placeholder="Add any notes..."
                  className="resize-none"
                  rows={2}
                />
              </div>

              {/* Receipt Upload */}
              <div className="space-y-2">
                <Label>Receipt (Optional)</Label>
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={receiptCameraRef}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={e => handleReceiptSelect(e, true)}
                  />
                  <input
                    type="file"
                    ref={receiptGalleryRef}
                    accept="image/*"
                    className="hidden"
                    onChange={e => handleReceiptSelect(e, false)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => receiptCameraRef.current?.click()}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Camera
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => receiptGalleryRef.current?.click()}
                  >
                    <ImagePlus className="h-4 w-4 mr-2" />
                    Gallery
                  </Button>
                </div>

                {/* Receipt Previews */}
                {depositReceipts.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {depositReceipts.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative w-20 h-20 rounded-lg overflow-hidden border group"
                      >
                        <img
                          src={url}
                          alt={`Receipt ${idx + 1}`}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => {
                            setReceiptViewerSrc(url);
                            setReceiptViewerOpen(true);
                          }}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={e => {
                            e.stopPropagation();
                            handleRemoveReceipt(idx);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Receipt Image Viewer */}
      <ImageViewer
        src={receiptViewerSrc}
        open={receiptViewerOpen}
        onOpenChange={setReceiptViewerOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Udhar Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this Udhar record. This action cannot be undone.
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

      {/* Delete Payment Confirmation Dialog */}
      <AlertDialog open={deletePaymentDialogOpen} onOpenChange={setDeletePaymentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the payment of ₹{paymentToDelete?.amount?.toLocaleString() || 0}. The
              udhar balance will be recalculated. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPaymentToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (paymentToDelete && onDeletePayment) {
                  const result = await onDeletePayment(
                    paymentToDelete.udharId,
                    paymentToDelete.paymentId
                  );
                  if (result?.success) {
                    toast.success("Payment deleted");
                  } else {
                    toast.error(result?.error || "Failed to delete payment");
                  }
                }
                setPaymentToDelete(null);
                setDeletePaymentDialogOpen(false);
              }}
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

export default UdharList;
