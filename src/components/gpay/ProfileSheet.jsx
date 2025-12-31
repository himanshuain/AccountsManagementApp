"use client";

import { useState } from "react";
import { 
  Phone, 
  Copy, 
  ExternalLink, 
  MapPin, 
  Building2,
  CreditCard,
  MessageSquare,
  Check,
  ChevronLeft,
  MoreVertical,
  Edit,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PersonAvatar } from "./PersonAvatar";
import { toast } from "sonner";
import { haptics } from "@/hooks/useHaptics";

/**
 * GPay-style profile sheet with contact info and actions
 * Includes UPI deep links for payment and chat
 */

// Generate UPI payment URL
const generateUpiPaymentUrl = (upiId, name, amount) => {
  if (!upiId) return null;
  
  const params = new URLSearchParams({
    pa: upiId, // Payee address
    pn: name || '', // Payee name
    cu: 'INR', // Currency
  });
  
  if (amount && amount > 0) {
    params.append('am', amount.toString());
  }
  
  return `upi://pay?${params.toString()}`;
};

// Generate GPay specific URL
const generateGPayUrl = (upiId, phoneNumber) => {
  // Try GPay deep link first
  if (phoneNumber) {
    // Remove country code if present
    const cleanPhone = phoneNumber.replace(/^\+91|^91/, '').replace(/\D/g, '');
    return `tez://upi/sendmoney?pn=&pa=&am=&tn=&mc=&mam=&mode=00&purpose=00&orgid=000000&refUrl=https://example.com&refId=ref&ver=01&sign=&qrdata=&psp=gpay&category=&extra=&phoneno=${cleanPhone}`;
  }
  
  if (upiId) {
    return `tez://upi/pay?pa=${upiId}&mc=0000&mode=02&purpose=00`;
  }
  
  return null;
};

export function ProfileSheet({
  open,
  onOpenChange,
  person, // supplier or customer object
  type = "supplier", // "supplier" | "customer"
  totalAmount = 0,
  paidAmount = 0,
  pendingAmount = 0,
  onEdit,
  onDelete,
  onCall,
  className
}) {
  const [copied, setCopied] = useState(null);

  if (!person) return null;

  const name = person.companyName || person.name || "Unknown";
  const secondaryName = person.companyName ? person.name : null;
  const phone = person.phone || person.phoneNumber;
  const upiId = person.upiId;
  const address = person.address;

  // Handle copy to clipboard
  const handleCopy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      haptics.light();
      toast.success(`${label} copied!`);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  // Handle phone call
  const handleCall = () => {
    if (!phone) return;
    haptics.light();
    
    if (onCall) {
      onCall(phone);
    } else {
      window.location.href = `tel:${phone}`;
    }
  };

  // Handle UPI payment
  const handleUpiPay = (amount = 0) => {
    haptics.medium();
    
    const url = generateUpiPaymentUrl(upiId, name, amount);
    if (url) {
      window.location.href = url;
    } else {
      toast.error("No UPI ID available");
    }
  };

  // Handle Open in GPay
  const handleOpenGPay = () => {
    haptics.medium();
    
    const url = generateGPayUrl(upiId, phone);
    if (url) {
      window.location.href = url;
    } else {
      // Fallback - try to open GPay app
      const fallbackUrl = `https://pay.google.com/`;
      window.open(fallbackUrl, '_blank');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className={cn(
          "h-[85vh] rounded-t-3xl p-0 flex flex-col",
          className
        )}
        hideClose
      >
        {/* Header */}
        <SheetHeader className="flex-shrink-0 flex flex-row items-center justify-between p-4 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-9 w-9"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </SheetHeader>

        {/* Profile Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Avatar and Name */}
          <div className="flex flex-col items-center py-6">
            <PersonAvatar
              name={name}
              image={person.profilePicture}
              size="xl"
            />
            <h2 className="text-xl font-bold mt-4">{name}</h2>
            {secondaryName && (
              <p className="text-sm text-muted-foreground">
                {type === "supplier" ? "Contact: " : ""}{secondaryName}
              </p>
            )}
          </div>

          {/* Contact Info Card */}
          <div className="mx-4 mb-4 rounded-2xl bg-card border overflow-hidden">
            {/* Phone */}
            {phone && (
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <p className="text-xs text-muted-foreground">Phone number</p>
                  <p className="font-medium">{phone}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCall}
                  className="h-10 w-10 text-primary"
                >
                  <Phone className="h-5 w-5" />
                </Button>
              </div>
            )}

            {/* UPI ID */}
            {upiId && (
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <p className="text-xs text-muted-foreground">UPI ID</p>
                  <p className="font-medium">{upiId}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(upiId, "UPI ID")}
                  className="h-10 w-10"
                >
                  {copied === "UPI ID" ? (
                    <Check className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Copy className="h-5 w-5 text-primary" />
                  )}
                </Button>
              </div>
            )}

            {/* Company (for suppliers) */}
            {type === "supplier" && person.companyName && (
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <p className="text-xs text-muted-foreground">Company</p>
                  <p className="font-medium">{person.companyName}</p>
                </div>
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
            )}

            {/* Address */}
            {address && (
              <div className="flex items-center justify-between p-4">
                <div className="flex-1 pr-4">
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="font-medium">{address}</p>
                </div>
                <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </div>
            )}
          </div>

          {/* Payment Summary (if has transactions) */}
          {totalAmount > 0 && (
            <div className="mx-4 mb-4 rounded-2xl bg-muted/50 p-4">
              <p className="text-xs text-muted-foreground mb-2">Payment Summary</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">₹{totalAmount.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-lg font-semibold",
                    pendingAmount > 0 ? "text-amber-500" : "text-emerald-500"
                  )}>
                    ₹{pendingAmount.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mx-4 mb-6 space-y-3">
            {/* Pay via GPay */}
            {upiId && (
              <Button
                className="w-full h-12 gap-2 bg-[#4285F4] hover:bg-[#3367D6] text-white"
                onClick={() => handleUpiPay(pendingAmount)}
              >
                <CreditCard className="h-5 w-5" />
                Pay{pendingAmount > 0 ? ` ₹${pendingAmount.toLocaleString('en-IN')}` : ""} via UPI
              </Button>
            )}

            {/* Open in GPay */}
            {(upiId || phone) && (
              <Button
                variant="outline"
                className="w-full h-12 gap-2"
                onClick={handleOpenGPay}
              >
                <ExternalLink className="h-5 w-5" />
                Open in GPay
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default ProfileSheet;





