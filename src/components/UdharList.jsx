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

  const getCustomerName = (customerId) => {
    const customer = customers?.find((c) => c.id === customerId);
    return customer?.name || "Unknown";
  };

  // Get total amount for an udhar entry (handles both old and new format)
  const getUdharAmount = (udhar) => {
    return (
      udhar.amount ||
      (udhar.cashAmount || 0) + (udhar.onlineAmount || 0)
    );
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

  const handleCardClick = (udhar) => {
    onEdit?.(udhar);
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

  // Calculate totals
  const totals = udharList.reduce(
    (acc, u) => {
      const total = getUdharAmount(u);
      const paid = u.paidAmount || (u.paidCash || 0) + (u.paidOnline || 0);
      const pending = total - paid;

      acc.total += total;
      acc.paid += paid;
      acc.pending += Math.max(0, pending);

      return acc;
    },
    {
      total: 0,
      paid: 0,
      pending: 0,
    },
  );

  // Separate pending and paid, then sort
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
            {/* Total */}
            <div className="text-center flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Total
              </p>
              <p className="text-xl font-bold">₹{totals.total.toLocaleString()}</p>
            </div>

            <div className="h-10 w-px bg-amber-500/20" />

            {/* Collected */}
            <div className="text-center flex-1">
              <p className="text-xs text-green-600 uppercase tracking-wide">
                Collected
              </p>
              <p className="text-xl font-bold text-green-600">
                ₹{totals.paid.toLocaleString()}
              </p>
            </div>

            <div className="h-10 w-px bg-amber-500/20" />

            {/* Pending */}
            <div className="text-center flex-1">
              <p className="text-xs text-amber-600 uppercase tracking-wide">
                Pending
              </p>
              <p className="text-xl font-bold text-amber-600">
                ₹{totals.pending.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="mt-2 text-center">
            <Badge variant="secondary" className="text-xs">
              {udharList.length} record{udharList.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Udhar List */}
      <div className="space-y-2">
        {sortedUdhar.map((udhar) => {
          const totalAmount = getUdharAmount(udhar);
          const paidAmount =
            udhar.paidAmount || (udhar.paidCash || 0) + (udhar.paidOnline || 0);
          const pendingAmount = Math.max(0, totalAmount - paidAmount);
          const isPaid = udhar.paymentStatus === "paid";
          const isPartial = udhar.paymentStatus === "partial";

          return (
            <Card
              key={udhar.id}
              onClick={() => handleCardClick(udhar)}
              className={cn(
                "overflow-hidden transition-all hover:shadow-md cursor-pointer active:scale-[0.99]",
                isPaid
                  ? "border-l-4 border-l-green-500 opacity-75"
                  : isPartial
                    ? "border-l-4 border-l-blue-500"
                    : "border-l-4 border-l-amber-500",
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {/* Amount */}
                      <span className="text-lg font-bold flex items-center gap-1">
                        <IndianRupee className="h-4 w-4" />
                        {totalAmount.toLocaleString()}
                      </span>
                      {/* Status badge */}
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
                        {isPaid ? "Paid" : isPartial ? "Partial" : "Pending"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {/* Date */}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(udhar.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "2-digit",
                        })}
                      </span>

                      {/* Customer */}
                      {showCustomer && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="truncate max-w-[120px]">
                            {getCustomerName(udhar.customerId)}
                          </span>
                        </span>
                      )}

                      {/* Item */}
                      {udhar.itemDescription && (
                        <span className="truncate max-w-[80px]">
                          {udhar.itemDescription}
                        </span>
                      )}
                    </div>

                    {/* Pending amount if partial */}
                    {!isPaid && paidAmount > 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        Remaining: ₹{pendingAmount.toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Right: Actions - Horizontal layout */}
                  <div className="flex items-center gap-1">
                    {!isPaid && (
                      <>
                        {/* Deposit Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleDepositClick(udhar, e)}
                          className="h-7 px-2 text-xs gap-1 text-blue-600 border-blue-600/30 hover:bg-blue-50"
                        >
                          <Plus className="h-3 w-3" />
                          Deposit
                        </Button>

                        {/* Full Paid Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleFullPaidClick(udhar, e)}
                          className="h-7 px-2 text-xs gap-1 text-green-600 border-green-600/30 hover:bg-green-50"
                        >
                          <Check className="h-3 w-3" />
                          Paid
                        </Button>
                      </>
                    )}

                    {/* Khata images */}
                    {udhar.khataPhotos?.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleViewImages(udhar.khataPhotos, e)}
                        className="h-7 w-7 p-0"
                      >
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteClick(udhar, e)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Khata Photos</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {selectedImages.map((url, index) => (
              <div
                key={index}
                className="aspect-square rounded-lg overflow-hidden bg-muted"
              >
                <img
                  src={url}
                  alt={`Khata ${index + 1}`}
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
              />
            </div>
            {udharForDeposit && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">
                  Total Udhar: ₹{getUdharAmount(udharForDeposit).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Already Paid: ₹
                  {(
                    udharForDeposit.paidAmount ||
                    (udharForDeposit.paidCash || 0) +
                      (udharForDeposit.paidOnline || 0)
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
