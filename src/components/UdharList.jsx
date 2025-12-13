"use client";

import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function UdharList({
  udharList,
  customers,
  onEdit,
  onDelete,
  onDeposit,
  onFullPaid,
  showCustomer = true,
  loading = false,
}) {
  const [selectedImages, setSelectedImages] = useState([]);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [udharToDelete, setUdharToDelete] = useState(null);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [udharForDeposit, setUdharForDeposit] = useState(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [expandedItems, setExpandedItems] = useState(new Set());

  const getCustomerName = (customerId) => {
    const customer = customers?.find((c) => c.id === customerId);
    return customer?.name || "Unknown";
  };

  const getUdharAmount = (udhar) => {
    return udhar.amount || (udhar.cashAmount || 0) + (udhar.onlineAmount || 0);
  };

  const getPaidAmount = (udhar) => {
    return udhar.paidAmount || (udhar.paidCash || 0) + (udhar.paidOnline || 0);
  };

  const toggleExpanded = (id) => {
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
    setDepositDialogOpen(true);
  };

  const handleFullPaidClick = (udhar, e) => {
    e.stopPropagation();
    onFullPaid?.(udhar.id);
    toast.success("Marked as fully paid!");
  };

  const handleDepositSubmit = () => {
    if (!depositAmount || Number(depositAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    onDeposit?.(udharForDeposit.id, Number(depositAmount));
    setDepositDialogOpen(false);
    setUdharForDeposit(null);
    toast.success("Deposit recorded!");
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
    { total: 0, paid: 0, pending: 0 },
  );

  const pendingUdhar = udharList
    .filter((u) => u.paymentStatus !== "paid")
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const paidUdhar = udharList
    .filter((u) => u.paymentStatus === "paid")
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const sortedUdhar = [...pendingUdhar, ...paidUdhar];

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
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
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Total
              </p>
              <p className="text-xl font-bold">
                ₹{totals.total.toLocaleString()}
              </p>
            </div>
            <div className="h-10 w-px bg-amber-500/20" />
            <div className="text-center flex-1">
              <p className="text-xs text-green-600 uppercase tracking-wide">
                Collected
              </p>
              <p className="text-xl font-bold text-green-600">
                ₹{totals.paid.toLocaleString()}
              </p>
            </div>
            <div className="h-10 w-px bg-amber-500/20" />
            <div className="text-center flex-1">
              <p className="text-xs text-amber-600 uppercase tracking-wide">
                Pending
              </p>
              <p className="text-xl font-bold text-amber-600">
                ₹{totals.pending.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Udhar List */}
      <div className="space-y-2">
        {sortedUdhar.map((udhar) => {
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
                  isExpanded && "shadow-md",
                )}
              >
                <CollapsibleTrigger asChild>
                  <CardContent className="p-3 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={cn(
                              "font-bold flex items-center gap-0.5",
                              totalAmount >= 10000 ? "text-lg" : "text-xl",
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
                                  : "bg-amber-500/20 text-amber-600",
                            )}
                          >
                            {isPaid
                              ? "Paid"
                              : isPartial
                                ? "Partial"
                                : "Pending"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(udhar.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "2-digit",
                            })}
                          </span>
                          {showCustomer && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span className="truncate max-w-[100px]">
                                {getCustomerName(udhar.customerId)}
                              </span>
                            </span>
                          )}
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
                          isExpanded && "rotate-180",
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
                              <div className="flex-1 flex items-center justify-between bg-green-500/10 rounded-lg p-2">
                                <div className="flex items-center gap-2">
                                  <Check className="h-3.5 w-3.5 text-green-600" />
                                  <span className="text-sm font-medium text-green-600">
                                    ₹{payment.amount?.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>
                                    {new Date(payment.date).toLocaleDateString(
                                      "en-IN",
                                      { day: "numeric", month: "short" },
                                    )}
                                  </span>
                                  {payment.receiptUrl && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={(e) =>
                                        handleViewImages(
                                          [payment.receiptUrl],
                                          e,
                                        )
                                      }
                                    >
                                      <Receipt className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
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
                            onClick={(e) => handleDepositClick(udhar, e)}
                            className="flex-1 h-9 text-xs gap-1 text-blue-600 border-blue-600/30 hover:bg-blue-50"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Deposit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleFullPaidClick(udhar, e)}
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
                          onClick={(e) =>
                            handleViewImages(udhar.khataPhotos, e)
                          }
                          className="h-9 px-3 text-xs gap-1"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          Photos
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleDeleteClick(udhar, e)}
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
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Photos</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {selectedImages.map((url, index) => (
              <div
                key={index}
                className="aspect-square rounded-lg overflow-hidden bg-muted"
              >
                <img
                  src={url}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Deposit Dialog */}
      <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Deposit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Deposit Amount (₹)</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Enter amount"
                className="text-xl h-14 font-semibold"
                autoFocus
              />
            </div>
            {udharForDeposit && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-xs text-muted-foreground">
                  Total Udhar: ₹
                  {getUdharAmount(udharForDeposit).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Already Paid: ₹
                  {getPaidAmount(udharForDeposit).toLocaleString()}
                </p>
                <p className="text-xs font-medium text-amber-600">
                  Remaining: ₹
                  {Math.max(
                    0,
                    getUdharAmount(udharForDeposit) -
                      getPaidAmount(udharForDeposit),
                  ).toLocaleString()}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => setDepositDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleDepositSubmit} className="flex-1">
                Record Deposit
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Udhar Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this Udhar record. This action cannot
              be undone.
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

export default UdharList;
