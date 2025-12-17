"use client";

import { useState } from "react";
import { CreditCard, CheckCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ImageUpload";
import { toast } from "sonner";

export function PaymentSheet({
  open,
  onOpenChange,
  transaction,
  onRecordPayment,
  onMarkFullPaid,
}) {
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentReceipt, setPaymentReceipt] = useState(null);

  const handleRecordPayment = async () => {
    if (!transaction || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    const result = await onRecordPayment(transaction.id, amount, paymentReceipt);
    if (result.success) {
      toast.success("Payment recorded");
      setPaymentAmount("");
      setPaymentReceipt(null);
      onOpenChange(false);
    } else {
      toast.error("Failed to record payment");
    }
  };

  const handleMarkFullPaid = async () => {
    if (!transaction) return;
    const result = await onMarkFullPaid(transaction.id, paymentReceipt);
    if (result.success) {
      toast.success("Marked as fully paid");
      setPaymentReceipt(null);
      onOpenChange(false);
    } else {
      toast.error("Failed to mark as paid");
    }
  };

  const handleClose = () => {
    setPaymentAmount("");
    setPaymentReceipt(null);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="top" className="h-auto max-h-[70vh] rounded-b-2xl p-0" hideClose>
        {/* Drag handle */}
        <div className="flex justify-center pb-2 pt-3" data-drag-handle>
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        <SheetHeader className="px-4 pb-2">
          <SheetTitle>Record Payment</SheetTitle>
        </SheetHeader>

        {transaction && (
          <div className="space-y-4 px-4 pb-6">
            {/* Summary */}
            <div className="space-y-2 rounded-xl bg-muted/50 p-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="font-semibold">
                  ₹{Number(transaction.amount || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Already Paid</span>
                <span className="font-semibold text-green-600">
                  ₹{Number(transaction.paidAmount || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 text-sm">
                <span className="text-muted-foreground">Pending</span>
                <span className="font-semibold text-amber-600">
                  ₹
                  {(
                    Number(transaction.amount || 0) -
                    Number(transaction.paidAmount || 0)
                  ).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Payment Amount</Label>
              <Input
                id="paymentAmount"
                type="number"
                placeholder="Enter amount"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                className="h-12 text-lg touch-manipulation"
              />
            </div>

            {/* Receipt Upload */}
            <div className="space-y-2">
              <Label>Payment Receipt (Optional)</Label>
              <div className="w-24">
                <ImageUpload
                  value={paymentReceipt}
                  onChange={setPaymentReceipt}
                  placeholder="Receipt"
                  aspectRatio="square"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                className="flex-1 touch-manipulation"
                onClick={handleRecordPayment}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Record Payment
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-green-200 text-green-600 hover:bg-green-50 touch-manipulation"
                onClick={handleMarkFullPaid}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark Full Paid
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

