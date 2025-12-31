"use client";

import { useState, useRef, useEffect } from "react";
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
import { resolveImageUrl } from "@/lib/image-url";
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
import { ImageViewer, ImageGalleryViewer } from "./PhotoViewer";

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
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryViewerOpen, setGalleryViewerOpen] = useState(false);
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
  const expandedItemRefs = useRef({});

  // Scroll expanded item into view after CRUD operations
  useEffect(() => {
    // Find the most recently expanded item
    const expandedArray = Array.from(expandedItems);
    if (expandedArray.length > 0) {
      const lastExpandedId = expandedArray[expandedArray.length - 1];
      const ref = expandedItemRefs.current[lastExpandedId];
      if (ref) {
        setTimeout(() => {
          ref.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }, 100);
      }
    }
  }, [expandedItems]);

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
    e?.stopPropagation();
    setGalleryImages(images);
    setGalleryViewerOpen(true);
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

    if (!udharForDeposit) {
      toast.error("No udhar selected");
      return;
    }

    // Calculate pending amount
    const totalAmount = getUdharAmount(udharForDeposit);
    const paidAmount = getPaidAmount(udharForDeposit);
    const pendingAmount = Math.max(0, totalAmount - paidAmount);
    const depositValue = Number(depositAmount);

    // Validate that deposit amount doesn't exceed pending amount
    if (depositValue > pendingAmount) {
      toast.error(`Cannot deposit more than pending amount of ₹${pendingAmount.toLocaleString()}`);
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

      // Keep the udhar expanded and scroll into view
      const newExpanded = new Set(expandedItems);
      newExpanded.add(udharForDeposit.id);
      setExpandedItems(newExpanded);

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

  // Use udharList as-is (sorting is handled by parent component)
  // Progressive loading for large lists
  const {
    visibleItems: visibleUdhar,
    hasMore,
    loadMore,
    loadMoreRef,
    remainingCount,
    totalCount,
  } = useProgressiveList(udharList, 15, 15);

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

  if (udharList.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>No Udhar records found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
              <p className="text-xl font-bold">₹{totals.total.toLocaleString()}</p>
            </div>
            <div className="h-10 w-px bg-amber-500/20" />
            <div className="flex-1 text-center">
              <p className="text-xs uppercase tracking-wide text-green-600">Collected</p>
              <p className="text-xl font-bold text-green-600">₹{totals.paid.toLocaleString()}</p>
            </div>
            <div className="h-10 w-px bg-amber-500/20" />
            <div className="flex-1 text-center">
              <p className="text-xs uppercase tracking-wide text-amber-600">Pending</p>
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
              onOpenChange={() => {
                toggleExpanded(udhar.id);
                // Store ref for scrolling
                if (!expandedItemRefs.current[udhar.id]) {
                  expandedItemRefs.current[udhar.id] = null;
                }
              }}
            >
              <Card
                ref={el => {
                  if (el && isExpanded) {
                    expandedItemRefs.current[udhar.id] = el;
                  }
                }}
                className={cn(
                  "overflow-hidden transition-all",
                  isPaid
                    ? "border-l-4 border-l-green-500 opacity-75"
                    : isPartial
                      ? "border-l-4 border-l-blue-500"
                      : "border-l-4 border-l-amber-500",
                  isExpanded && "shadow-md ring-2 ring-primary/20"
                )}
              >
                <CollapsibleTrigger asChild>
                  <CardContent
                    className={cn(
                      "cursor-pointer p-3 transition-colors",
                      isExpanded ? "bg-primary/5" : "hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span
                            className={cn(
                              "flex items-center gap-0.5 font-bold",
                              totalAmount >= 10000 ? "text-lg" : "text-xl"
                            )}
                          >
                            <IndianRupee className="h-4 w-4" />
                            {totalAmount.toLocaleString()}
                          </span>
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
                        {/* Customer with DP */}
                        {showCustomer &&
                          (() => {
                            const customer = getCustomer(udhar.customerId);
                            return (
                              <div className="mb-1 flex items-center gap-2">
                                <Link
                                  href={`/customers?open=${udhar.customerId}`}
                                  className="inline-flex items-center gap-2 transition-opacity hover:opacity-80"
                                  onClick={e => e.stopPropagation()}
                                >
                                  {customer?.profilePicture ? (
                                    <img
                                      src={resolveImageUrl(customer.profilePicture)}
                                      alt=""
                                      className="h-7 w-7 flex-shrink-0 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                                      <span className="text-xs font-semibold text-amber-600">
                                        {(customer?.name || "?").charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  )}
                                  <span className="max-w-[120px] truncate text-sm font-semibold">
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
                          <p className="mt-1 text-xs text-amber-600">
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
                  <div className="space-y-3 border-t bg-primary/5 px-3 pb-3">
                    {udhar.notes && (
                      <p className="rounded-lg bg-muted/50 p-2 text-sm text-muted-foreground">
                        {udhar.notes}
                      </p>
                    )}

                    {/* Payment Timeline */}
                    {payments.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Payment History
                        </p>
                        <div className="relative space-y-2 pl-4">
                          <div className="absolute bottom-2 left-[7px] top-2 w-0.5 bg-green-500/30" />
                          {payments.map((payment, idx) => (
                            <div
                              key={payment.id || idx}
                              className="relative flex items-start gap-2"
                            >
                              <div className="absolute left-[-13px] top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500" />
                              <div className="flex-1 rounded-lg bg-green-500/10 p-2">
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
                                  <p className="mt-1 pl-5 text-xs italic text-muted-foreground">
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
                    <div className="flex flex-wrap items-center gap-2 border-t pt-2">
                      {!isPaid && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={e => handleDepositClick(udhar, e)}
                            className="h-9 flex-1 gap-1 border-blue-600/30 text-xs text-blue-600 hover:bg-blue-50"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Collect
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={e => handleFullPaidClick(udhar, e)}
                            className="h-9 flex-1 gap-1 border-green-600/30 text-xs text-green-600 hover:bg-green-50"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Full Paid
                          </Button>
                        </>
                      )}
                      {(udhar.khataPhotos?.length > 0 || udhar.billImages?.length > 0) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={e =>
                            handleViewImages(
                              [...(udhar.khataPhotos || []), ...(udhar.billImages || [])],
                              e
                            )
                          }
                          className="h-9 gap-1 px-3 text-xs"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          Photos (
                          {(udhar.khataPhotos?.length || 0) + (udhar.billImages?.length || 0)})
                        </Button>
                      )}
                      {onEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation();
                            onEdit(udhar);
                          }}
                          className="h-9 gap-1 px-3 text-xs"
                        >
                          Edit
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={e => handleDeleteClick(udhar, e)}
                        className="h-9 gap-1 border-destructive/30 px-3 text-xs text-destructive hover:bg-destructive/10"
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
          totalCount={totalCount}
        />
      </div>

      {/* Image Gallery Viewer for full-screen viewing */}
      <ImageGalleryViewer
        images={galleryImages}
        open={galleryViewerOpen}
        onOpenChange={setGalleryViewerOpen}
      />

      {/* Collect Sheet */}
      <Sheet
        open={depositSheetOpen}
        onOpenChange={open => {
          if (!open && !receiptViewerOpen) resetDepositForm();
          else setDepositSheetOpen(open);
        }}
      >
        <SheetContent side="top" className="h-auto max-h-[85vh] rounded-b-2xl p-0" hideClose>
          <SheetHeader className="flex flex-row items-center justify-between border-b p-4">
            <SheetTitle>Record Collect</SheetTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={resetDepositForm}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDepositSubmit}
                disabled={(() => {
                  if (isSubmitting || !depositAmount) return true;
                  if (!udharForDeposit) return true;
                  const amount = parseFloat(depositAmount);
                  if (isNaN(amount) || amount <= 0) return true;
                  const totalAmount = getUdharAmount(udharForDeposit);
                  const paidAmount = getPaidAmount(udharForDeposit);
                  const pendingAmount = Math.max(0, totalAmount - paidAmount);
                  return amount > pendingAmount;
                })()}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </SheetHeader>
          <ScrollArea className="max-h-[calc(85vh-60px)]">
            <div className="space-y-4 p-4">
              {/* Amount Summary */}
              {udharForDeposit && (
                <div className="space-y-1 rounded-lg bg-muted/50 p-3">
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
                  onChange={e => {
                    const value = e.target.value;
                    setDepositAmount(value);

                    // Real-time validation feedback
                    if (value && udharForDeposit) {
                      const amount = parseFloat(value);
                      const totalAmount = getUdharAmount(udharForDeposit);
                      const paidAmount = getPaidAmount(udharForDeposit);
                      const pendingAmount = Math.max(0, totalAmount - paidAmount);

                      if (!isNaN(amount) && amount > pendingAmount) {
                        e.target.classList.add("border-destructive");
                      } else {
                        e.target.classList.remove("border-destructive");
                      }
                    }
                  }}
                  max={
                    udharForDeposit
                      ? (() => {
                          const totalAmount = getUdharAmount(udharForDeposit);
                          const paidAmount = getPaidAmount(udharForDeposit);
                          return Math.max(0, totalAmount - paidAmount);
                        })()
                      : undefined
                  }
                  placeholder="Enter amount"
                  className="h-14 text-xl font-semibold"
                  autoFocus
                />
                {udharForDeposit &&
                  depositAmount &&
                  (() => {
                    const amount = parseFloat(depositAmount);
                    const totalAmount = getUdharAmount(udharForDeposit);
                    const paidAmount = getPaidAmount(udharForDeposit);
                    const pendingAmount = Math.max(0, totalAmount - paidAmount);
                    if (!isNaN(amount) && amount > pendingAmount) {
                      return (
                        <p className="mt-1 text-xs text-destructive">
                          Cannot exceed pending amount of ₹{pendingAmount.toLocaleString()}
                        </p>
                      );
                    }
                    return null;
                  })()}
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
                    <Camera className="mr-2 h-4 w-4" />
                    Camera
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => receiptGalleryRef.current?.click()}
                  >
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Gallery
                  </Button>
                </div>

                {/* Receipt Previews */}
                {depositReceipts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {depositReceipts.map((url, idx) => (
                      <div
                        key={idx}
                        className="group relative h-20 w-20 overflow-hidden rounded-lg border"
                      >
                        <img
                          src={resolveImageUrl(url)}
                          alt={`Receipt ${idx + 1}`}
                          className="h-full w-full cursor-pointer object-cover"
                          onClick={() => {
                            setReceiptViewerSrc(resolveImageUrl(url));
                            setReceiptViewerOpen(true);
                          }}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute right-1 top-1 h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
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
