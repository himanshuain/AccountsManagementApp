"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Plus,
  Users,
  Search,
  IndianRupee,
  Phone,
  Calendar,
  ChevronRight,
  ChevronDown,
  Edit,
  Trash2,
  ArrowLeft,
  MapPin,
  Banknote,
  CheckCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  Receipt,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Label } from "@/components/ui/label";
import useCustomers from "@/hooks/useCustomers";
import useUdhar from "@/hooks/useUdhar";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { CustomerForm } from "@/components/CustomerForm";
import { UdharForm } from "@/components/UdharForm";
import { toast } from "sonner";
import { cn, getAmountTextSize } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageViewer } from "@/components/ImageViewer";

export default function CustomersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const {
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    loading: customersLoading,
  } = useCustomers();
  const {
    udharList,
    addUdhar,
    recordDeposit,
    markFullPaid,
    loading: udharLoading,
  } = useUdhar();

  const [searchQuery, setSearchQuery] = useState("");
  const [customerFormOpen, setCustomerFormOpen] = useState(false);
  const [udharFormOpen, setUdharFormOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddAmount, setQuickAddAmount] = useState("");
  const [quickAddCustomer, setQuickAddCustomer] = useState(null);

  // New customer with initial amount
  const [newCustomerWithAmount, setNewCustomerWithAmount] = useState(false);
  const [initialAmount, setInitialAmount] = useState("");

  // Customer detail view
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentUdhar, setPaymentUdhar] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const paymentInputRef = useRef(null);

  // Quick collect dialog state (for collecting from customer card)
  const [quickCollectOpen, setQuickCollectOpen] = useState(false);
  const [quickCollectCustomer, setQuickCollectCustomer] = useState(null);
  const [quickCollectAmount, setQuickCollectAmount] = useState("");
  const quickCollectInputRef = useRef(null);

  // Expanded customer actions state
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);

  // Expanded udhar transactions (to show payment timeline)
  const [expandedUdharId, setExpandedUdharId] = useState(null);

  // Image viewer state
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerSrc, setImageViewerSrc] = useState("");

  // Auto-focus payment input
  useEffect(() => {
    if (paymentDialogOpen && paymentInputRef.current) {
      setTimeout(() => {
        paymentInputRef.current?.focus();
      }, 100);
    }
  }, [paymentDialogOpen]);

  // Auto-focus quick collect input
  useEffect(() => {
    if (quickCollectOpen && quickCollectInputRef.current) {
      setTimeout(() => {
        quickCollectInputRef.current?.focus();
      }, 100);
    }
  }, [quickCollectOpen]);

  // Calculate totals for each customer
  const customersWithStats = useMemo(() => {
    return customers.map((customer) => {
      const customerUdhar = udharList.filter(
        (u) => u.customerId === customer.id,
      );

      const totalAmount = customerUdhar.reduce((sum, u) => {
        return sum + (u.amount || (u.cashAmount || 0) + (u.onlineAmount || 0));
      }, 0);

      const paidAmount = customerUdhar.reduce((sum, u) => {
        return sum + (u.paidAmount || (u.paidCash || 0) + (u.paidOnline || 0));
      }, 0);

      const pendingAmount = Math.max(0, totalAmount - paidAmount);
      const transactionCount = customerUdhar.length;

      return {
        ...customer,
        totalAmount,
        paidAmount,
        pendingAmount,
        transactionCount,
      };
    });
  }, [customers, udharList]);

  // Handle opening customer from URL query parameter (e.g., from search)
  useEffect(() => {
    const openCustomerId = searchParams.get("open");
    if (openCustomerId && customersWithStats.length > 0 && !customersLoading) {
      const customerToOpen = customersWithStats.find(
        (c) => c.id === openCustomerId,
      );
      if (customerToOpen) {
        setSelectedCustomer(customerToOpen);
        // Clear the query parameter from URL without triggering a navigation
        router.replace("/customers", { scroll: false });
      }
    }
  }, [searchParams, customersWithStats, customersLoading, router]);

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    let filtered = customersWithStats;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name?.toLowerCase().includes(query) ||
          c.phone?.includes(query) ||
          c.address?.toLowerCase().includes(query),
      );
    }

    // Sort by most recently updated
    return filtered.sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
    );
  }, [customersWithStats, searchQuery]);

  // Quick add udhar for a customer
  const handleQuickAdd = async () => {
    if (!quickAddAmount || Number(quickAddAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const result = await addUdhar({
      customerId: quickAddCustomer.id,
      amount: Number(quickAddAmount),
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });

    if (result.success) {
      toast.success(`₹${Number(quickAddAmount).toLocaleString()} Udhar added`);
      setQuickAddOpen(false);
      setQuickAddAmount("");
      setQuickAddCustomer(null);
    } else {
      toast.error("Failed to add Udhar");
    }
  };

  // Handle new customer with initial amount
  const handleAddCustomerWithAmount = async (customerData) => {
    const result = await addCustomer(customerData);

    if (result.success && initialAmount && Number(initialAmount) > 0) {
      // Add initial udhar transaction
      await addUdhar({
        customerId: result.data.id,
        amount: Number(initialAmount),
        date: new Date().toISOString().split("T")[0],
        notes: "Initial lending amount",
      });
      toast.success("Customer added with initial Udhar");
    } else if (result.success) {
      toast.success("Customer added");
    }

    setNewCustomerWithAmount(false);
    setInitialAmount("");
    return result;
  };

  const getCustomerInitials = (name) => {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "??"
    );
  };

  // Helper to format relative date
  const formatRelativeDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  // Get transactions for selected customer
  const selectedCustomerTransactions = useMemo(() => {
    if (!selectedCustomer) return [];
    return udharList
      .filter((u) => u.customerId === selectedCustomer.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [selectedCustomer, udharList]);

  // Handle customer edit
  const handleEditCustomer = async (data) => {
    if (!editingCustomer) return;
    const result = await updateCustomer(editingCustomer.id, data);
    if (result.success) {
      toast.success("Customer updated");
      setEditingCustomer(null);
      // Update selected customer if viewing
      if (selectedCustomer?.id === editingCustomer.id) {
        setSelectedCustomer({ ...selectedCustomer, ...data });
      }
    } else {
      toast.error("Failed to update customer");
    }
  };

  // Handle customer delete
  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    const result = await deleteCustomer(customerToDelete.id);
    if (result.success) {
      toast.success("Customer deleted");
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
      // Close detail view if deleting current customer
      if (selectedCustomer?.id === customerToDelete.id) {
        setSelectedCustomer(null);
      }
    } else {
      toast.error("Failed to delete customer");
    }
  };

  // Handle payment for udhar
  const handleOpenPayment = (txn) => {
    const total = txn.amount || (txn.cashAmount || 0) + (txn.onlineAmount || 0);
    const paid = txn.paidAmount || (txn.paidCash || 0) + (txn.paidOnline || 0);
    const pending = Math.max(0, total - paid);

    setPaymentUdhar(txn);
    setPaymentAmount(pending.toString());
    setPaymentDialogOpen(true);
  };

  const handleRecordPayment = async () => {
    if (!paymentUdhar || !paymentAmount || Number(paymentAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const result = await recordDeposit(paymentUdhar.id, Number(paymentAmount));

    if (result.success) {
      toast.success(
        `₹${Number(paymentAmount).toLocaleString()} payment recorded`,
      );
      setPaymentDialogOpen(false);
      setPaymentUdhar(null);
      setPaymentAmount("");
    } else {
      toast.error(result.error || "Failed to record payment");
    }
  };

  const handleMarkFullPaidFromDialog = async () => {
    if (!paymentUdhar) return;

    const result = await markFullPaid(paymentUdhar.id);

    if (result.success) {
      toast.success("Marked as fully paid");
      setPaymentDialogOpen(false);
      setPaymentUdhar(null);
      setPaymentAmount("");
    } else {
      toast.error(result.error || "Failed to mark as paid");
    }
  };

  // Quick collect from customer card
  const handleQuickCollect = (customer) => {
    setQuickCollectCustomer(customer);
    setQuickCollectAmount(customer.pendingAmount.toString());
    setQuickCollectOpen(true);
  };

  const handleQuickCollectSubmit = async () => {
    if (
      !quickCollectCustomer ||
      !quickCollectAmount ||
      Number(quickCollectAmount) <= 0
    ) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Get the oldest pending udhar for this customer
    const customerUdhars = udharList
      .filter(
        (u) =>
          u.customerId === quickCollectCustomer.id &&
          u.paymentStatus !== "paid",
      )
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (customerUdhars.length === 0) {
      toast.error("No pending Udhar found");
      return;
    }

    let remainingAmount = Number(quickCollectAmount);

    // Apply payment to oldest udhar entries first
    for (const udhar of customerUdhars) {
      if (remainingAmount <= 0) break;

      const total =
        udhar.amount || (udhar.cashAmount || 0) + (udhar.onlineAmount || 0);
      const paid =
        udhar.paidAmount || (udhar.paidCash || 0) + (udhar.paidOnline || 0);
      const pending = Math.max(0, total - paid);

      if (pending <= 0) continue;

      const paymentForThis = Math.min(remainingAmount, pending);
      const result = await recordDeposit(udhar.id, paymentForThis);

      if (!result.success) {
        toast.error(result.error || "Failed to record payment");
        return;
      }

      remainingAmount -= paymentForThis;
    }

    toast.success(`₹${Number(quickCollectAmount).toLocaleString()} collected`);
    setQuickCollectOpen(false);
    setQuickCollectCustomer(null);
    setQuickCollectAmount("");
  };

  // Get full customer data with stats
  const getFullCustomerData = (customerId) => {
    return customersWithStats.find((c) => c.id === customerId);
  };

  const loading = customersLoading || udharLoading;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground">
            {customers.length} customer{customers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          onClick={() => {
            if (!isOnline) {
              toast.error("Cannot add while offline");
              return;
            }
            setNewCustomerWithAmount(true);
            setCustomerFormOpen(true);
          }}
          disabled={!isOnline}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search customers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Summary Card */}
      {customersWithStats.length > 0 &&
        (() => {
          const totalUdhar = customersWithStats.reduce(
            (sum, c) => sum + c.totalAmount,
            0,
          );
          const totalCollected = customersWithStats.reduce(
            (sum, c) => sum + c.paidAmount,
            0,
          );
          const totalPending = customersWithStats.reduce(
            (sum, c) => sum + c.pendingAmount,
            0,
          );
          return (
            <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Total Udhar</p>
                    <p
                      className={cn(
                        "font-bold truncate",
                        getAmountTextSize(totalUdhar, "lg"),
                      )}
                    >
                      ₹{totalUdhar.toLocaleString()}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-amber-500/20 flex-shrink-0" />
                  <div className="text-center flex-1 min-w-0">
                    <p className="text-xs text-green-600">Collected</p>
                    <p
                      className={cn(
                        "font-bold text-green-600 truncate",
                        getAmountTextSize(totalCollected, "lg"),
                      )}
                    >
                      ₹{totalCollected.toLocaleString()}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-amber-500/20 flex-shrink-0" />
                  <div className="text-center flex-1 min-w-0">
                    <p className="text-xs text-amber-600">Pending</p>
                    <p
                      className={cn(
                        "font-bold text-amber-600 truncate",
                        getAmountTextSize(totalPending, "lg"),
                      )}
                    >
                      ₹{totalPending.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

      {/* Customer List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="border-l-4 border-l-muted">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-12 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            {searchQuery ? (
              <>
                <p>No customers found</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              </>
            ) : (
              <>
                <p>No customers yet</p>
                <Button
                  variant="link"
                  className="mt-2"
                  onClick={() => setCustomerFormOpen(true)}
                  disabled={!isOnline}
                >
                  Add your first customer
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredCustomers.map((customer) => {
            const isExpanded = expandedCustomerId === customer.id;

            // Get all payments for this customer from all udhar transactions
            const customerPayments = isExpanded
              ? udharList
                  .filter((u) => u.customerId === customer.id)
                  .flatMap((u) =>
                    (u.payments || []).map((p) => ({
                      ...p,
                      udharId: u.id,
                      udharAmount:
                        u.amount || (u.cashAmount || 0) + (u.onlineAmount || 0),
                    })),
                  )
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
              : [];

            return (
              <Card
                key={customer.id}
                className={cn(
                  "overflow-hidden transition-all",
                  customer.pendingAmount > 0
                    ? "border-l-4 border-l-amber-500"
                    : "border-l-4 border-l-green-500",
                )}
              >
                <CardContent className="p-0">
                  {/* Main Row - tap to expand/collapse */}
                  <div
                    className="p-3 cursor-pointer hover:bg-muted/50 active:scale-[0.99] transition-all"
                    onClick={() =>
                      setExpandedCustomerId(isExpanded ? null : customer.id)
                    }
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar - tap to open details */}
                      <Avatar
                        className="h-12 w-12 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomer(customer);
                        }}
                      >
                        <AvatarImage src={customer.profilePicture} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getCustomerInitials(customer.name)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">
                            {customer.name}
                          </p>
                          {customer.transactionCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {customer.transactionCount} txn
                            </Badge>
                          )}
                        </div>
                        {customer.phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </p>
                        )}
                        {customer.pendingAmount > 0 && (
                          <p className="text-sm font-semibold text-amber-600 mt-1">
                            Pending: ₹{customer.pendingAmount.toLocaleString()}
                          </p>
                        )}
                      </div>

                      {/* Single Chevron - indicates expandable */}
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 text-muted-foreground transition-transform",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </div>
                  </div>

                  {/* Collapsible Section with Progress, Payment History & Actions */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0 border-t bg-muted/30">
                      {/* Payment Progress Bar - only show if there's any transaction */}
                      {customer.totalAmount > 0 && (
                        <div className="pt-3 pb-2">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground">
                              Total: ₹{customer.totalAmount.toLocaleString()}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-green-600">
                                Paid: ₹{customer.paidAmount.toLocaleString()}
                              </span>
                              {customer.pendingAmount > 0 && (
                                <span className="text-amber-600">
                                  Pending: ₹
                                  {customer.pendingAmount.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                customer.pendingAmount === 0
                                  ? "bg-green-500"
                                  : "bg-gradient-to-r from-green-500 to-green-400",
                              )}
                              style={{
                                width: `${customer.totalAmount > 0 ? (customer.paidAmount / customer.totalAmount) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Payment History Timeline */}
                      {customerPayments.length > 0 && (
                        <div className="pt-2 pb-2">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Payment History
                          </p>
                          <div className="space-y-0 max-h-[150px] overflow-y-auto">
                            {customerPayments
                              .slice(0, 5)
                              .map((payment, index, arr) => (
                                <div key={payment.id} className="flex">
                                  {/* Timeline line and dot */}
                                  <div className="flex flex-col items-center mr-3">
                                    <div
                                      className={cn(
                                        "w-3 h-3 rounded-full flex items-center justify-center",
                                        index === 0
                                          ? "bg-green-500"
                                          : "bg-green-400",
                                      )}
                                    >
                                      <CheckCircle2 className="w-2 h-2 text-white" />
                                    </div>
                                    {index < arr.length - 1 && (
                                      <div className="w-0.5 h-full min-h-[20px] bg-green-300" />
                                    )}
                                  </div>

                                  {/* Payment details */}
                                  <div className="flex-1 pb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-green-600 text-sm">
                                        ₹{payment.amount.toLocaleString()}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        — {formatRelativeDate(payment.date)}
                                      </span>
                                      {payment.receiptUrl && (
                                        <Receipt className="h-3 w-3 text-primary" />
                                      )}
                                    </div>
                                    {payment.isFinalPayment && (
                                      <span className="text-xs text-green-600">
                                        Final payment
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            {customerPayments.length > 5 && (
                              <p className="text-xs text-muted-foreground pl-6">
                                +{customerPayments.length - 5} more payments
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2">
                        {/* View Details Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-10 text-sm gap-2"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setExpandedCustomerId(null);
                          }}
                        >
                          <ChevronRight className="h-4 w-4" />
                          View Details
                        </Button>
                        {/* Collect Payment Button - only show if pending amount */}
                        {customer.pendingAmount > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-10 text-sm gap-2 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                            onClick={() => {
                              if (!isOnline) {
                                toast.error("Cannot collect while offline");
                                return;
                              }
                              handleQuickCollect(customer);
                              setExpandedCustomerId(null);
                            }}
                            disabled={!isOnline}
                          >
                            <CreditCard className="h-4 w-4" />
                            Collect
                          </Button>
                        )}
                        {/* Quick Add Udhar Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-10 text-sm gap-2 bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                          onClick={() => {
                            if (!isOnline) {
                              toast.error("Cannot add while offline");
                              return;
                            }
                            setQuickAddCustomer(customer);
                            setQuickAddOpen(true);
                            setExpandedCustomerId(null);
                          }}
                          disabled={!isOnline}
                        >
                          <Plus className="h-4 w-4" />
                          Udhar
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Customer Form - Only show when NOT editing */}
      {!editingCustomer && (
        <CustomerForm
          open={customerFormOpen}
          onOpenChange={(open) => {
            setCustomerFormOpen(open);
            if (!open) {
              setNewCustomerWithAmount(false);
              setInitialAmount("");
            }
          }}
          onSubmit={
            newCustomerWithAmount ? handleAddCustomerWithAmount : addCustomer
          }
          title={
            newCustomerWithAmount ? "Add Customer with Udhar" : "Add Customer"
          }
          showInitialAmount={newCustomerWithAmount}
          initialAmount={initialAmount}
          onInitialAmountChange={setInitialAmount}
        />
      )}

      {/* Udhar Form */}
      <UdharForm
        open={udharFormOpen}
        onOpenChange={setUdharFormOpen}
        onSubmit={addUdhar}
        onAddCustomer={addCustomer}
        customers={customers}
        defaultCustomerId={selectedCustomerId}
      />

      {/* Quick Add Dialog */}
      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Quick Add Udhar</DialogTitle>
            <DialogDescription>
              Add Udhar for {quickAddCustomer?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={quickAddAmount}
                onChange={(e) => setQuickAddAmount(e.target.value)}
                placeholder="Enter amount"
                className="text-2xl h-16 font-bold text-center"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => {
                  setQuickAddOpen(false);
                  setQuickAddAmount("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleQuickAdd} className="flex-1">
                Add Udhar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Collect Dialog */}
      <Dialog open={quickCollectOpen} onOpenChange={setQuickCollectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Collect Payment</DialogTitle>
            <DialogDescription>
              Collect Udhar from {quickCollectCustomer?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {quickCollectCustomer && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Pending</span>
                  <span className="font-bold text-amber-600">
                    ₹{quickCollectCustomer.pendingAmount?.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Amount to Collect (₹)</Label>
              <Input
                ref={quickCollectInputRef}
                type="number"
                inputMode="numeric"
                value={quickCollectAmount}
                onChange={(e) => setQuickCollectAmount(e.target.value)}
                placeholder="Enter amount"
                className="text-2xl h-16 font-bold text-center"
              />
            </div>
          </div>

          <DialogFooter>
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => {
                  setQuickCollectOpen(false);
                  setQuickCollectCustomer(null);
                  setQuickCollectAmount("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleQuickCollectSubmit}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Collect
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Customer is paying back Udhar</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {paymentUdhar &&
              (() => {
                const totalAmount =
                  paymentUdhar.amount ||
                  (paymentUdhar.cashAmount || 0) +
                    (paymentUdhar.onlineAmount || 0);
                const paidAmount =
                  paymentUdhar.paidAmount ||
                  (paymentUdhar.paidCash || 0) + (paymentUdhar.paidOnline || 0);
                const pendingAmount = Math.max(0, totalAmount - paidAmount);

                return (
                  <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Total Amount
                      </span>
                      <span className="font-bold">
                        ₹{totalAmount.toLocaleString()}
                      </span>
                    </div>
                    {paidAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Already Paid</span>
                        <span className="font-medium text-green-600">
                          ₹{paidAmount.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="text-amber-600 font-medium">
                        Pending
                      </span>
                      <span className="font-bold text-amber-600">
                        ₹{pendingAmount.toLocaleString()}
                      </span>
                    </div>
                    {paymentUdhar.notes && (
                      <div className="flex justify-between text-xs text-muted-foreground pt-1">
                        <span>Notes</span>
                        <span className="truncate max-w-[150px]">
                          {paymentUdhar.notes}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

            {/* Payment Amount Input */}
            <div className="space-y-2">
              <Label>Payment Amount (₹)</Label>
              <Input
                ref={paymentInputRef}
                type="number"
                inputMode="numeric"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
                className="text-2xl h-14 font-bold text-center"
              />
            </div>
          </div>

          <DialogFooter>
            <div className="flex flex-col gap-2 w-full">
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPaymentDialogOpen(false);
                    setPaymentUdhar(null);
                    setPaymentAmount("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRecordPayment}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={
                    !isOnline || !paymentAmount || Number(paymentAmount) <= 0
                  }
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </div>
              {paymentUdhar &&
                (() => {
                  const totalAmount =
                    paymentUdhar.amount ||
                    (paymentUdhar.cashAmount || 0) +
                      (paymentUdhar.onlineAmount || 0);
                  const paidAmount =
                    paymentUdhar.paidAmount ||
                    (paymentUdhar.paidCash || 0) +
                      (paymentUdhar.paidOnline || 0);
                  const pendingAmount = totalAmount - paidAmount;

                  return pendingAmount > 0 ? (
                    <Button
                      variant="outline"
                      onClick={handleMarkFullPaidFromDialog}
                      className="w-full text-green-600 border-green-200 hover:bg-green-50"
                      disabled={!isOnline}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Mark Full Amount as Paid
                    </Button>
                  ) : null;
                })()}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Detail View */}
      <Dialog
        open={!!selectedCustomer}
        onOpenChange={(open) => !open && setSelectedCustomer(null)}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {selectedCustomer && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex-1">
                    <DialogTitle>{selectedCustomer.name}</DialogTitle>
                    <DialogDescription>Customer Details</DialogDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      if (!isOnline) {
                        toast.error("Cannot edit while offline");
                        return;
                      }
                      setEditingCustomer(selectedCustomer);
                    }}
                    disabled={!isOnline}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (!isOnline) {
                        toast.error("Cannot delete while offline");
                        return;
                      }
                      setCustomerToDelete(selectedCustomer);
                      setDeleteDialogOpen(true);
                    }}
                    disabled={!isOnline}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Profile Info */}
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <Avatar
                    className={cn(
                      "h-16 w-16",
                      selectedCustomer.profilePicture &&
                        "cursor-pointer hover:ring-2 hover:ring-primary transition-all",
                    )}
                    onClick={() => {
                      if (selectedCustomer.profilePicture) {
                        setImageViewerSrc(selectedCustomer.profilePicture);
                        setImageViewerOpen(true);
                      }
                    }}
                  >
                    <AvatarImage src={selectedCustomer.profilePicture} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                      {getCustomerInitials(selectedCustomer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">
                      {selectedCustomer.name}
                    </h3>
                    {selectedCustomer.phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedCustomer.phone}
                      </p>
                    )}
                    {selectedCustomer.address && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {selectedCustomer.address}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-lg bg-muted/50 text-center min-w-0">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p
                      className={cn(
                        "font-bold truncate",
                        getAmountTextSize(
                          selectedCustomer.totalAmount || 0,
                          "lg",
                        ),
                      )}
                    >
                      ₹{(selectedCustomer.totalAmount || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/10 text-center min-w-0">
                    <p className="text-xs text-green-600">Paid</p>
                    <p
                      className={cn(
                        "font-bold text-green-600 truncate",
                        getAmountTextSize(
                          selectedCustomer.paidAmount || 0,
                          "lg",
                        ),
                      )}
                    >
                      ₹{(selectedCustomer.paidAmount || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/10 text-center min-w-0">
                    <p className="text-xs text-amber-600">Pending</p>
                    <p
                      className={cn(
                        "font-bold text-amber-600 truncate",
                        getAmountTextSize(
                          selectedCustomer.pendingAmount || 0,
                          "lg",
                        ),
                      )}
                    >
                      ₹{(selectedCustomer.pendingAmount || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Add Udhar Button */}
                <Button
                  className="w-full"
                  onClick={() => {
                    if (!isOnline) {
                      toast.error("Cannot add while offline");
                      return;
                    }
                    setQuickAddCustomer(selectedCustomer);
                    setQuickAddOpen(true);
                  }}
                  disabled={!isOnline}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Udhar
                </Button>

                {/* Transactions List */}
                <div className="space-y-2">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    Udhar Transactions ({selectedCustomerTransactions.length})
                  </h4>

                  {selectedCustomerTransactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No transactions yet
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto">
                      {selectedCustomerTransactions.map((txn) => {
                        const total =
                          txn.amount ||
                          (txn.cashAmount || 0) + (txn.onlineAmount || 0);
                        const paid =
                          txn.paidAmount ||
                          (txn.paidCash || 0) + (txn.paidOnline || 0);
                        const pending = Math.max(0, total - paid);
                        const isPaid = txn.paymentStatus === "paid";
                        const isPartial = txn.paymentStatus === "partial";
                        const hasPayments =
                          txn.payments && txn.payments.length > 0;
                        const isExpanded = expandedUdharId === txn.id;

                        return (
                          <div
                            key={txn.id}
                            className={cn(
                              "rounded-lg border overflow-hidden",
                              isPaid
                                ? "bg-green-500/5 border-green-500/20"
                                : isPartial
                                  ? "bg-blue-500/5 border-blue-500/20"
                                  : "bg-amber-500/5 border-amber-500/20",
                            )}
                          >
                            {/* Main Transaction Row */}
                            <div className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {isPaid ? (
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                  ) : isPartial ? (
                                    <Clock className="h-4 w-4 text-blue-500" />
                                  ) : (
                                    <Clock className="h-4 w-4 text-amber-500" />
                                  )}
                                  <span className="font-semibold">
                                    ₹{total.toLocaleString()}
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    className={cn(
                                      "text-xs",
                                      isPaid
                                        ? "bg-green-100 text-green-700"
                                        : isPartial
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-amber-100 text-amber-700",
                                    )}
                                  >
                                    {isPaid
                                      ? "Paid"
                                      : isPartial
                                        ? "Partial"
                                        : "Pending"}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  {/* Expand button for payments timeline */}
                                  {hasPayments && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setExpandedUdharId(
                                          isExpanded ? null : txn.id,
                                        )
                                      }
                                      className="h-7 w-7 p-0"
                                    >
                                      <ChevronDown
                                        className={cn(
                                          "h-4 w-4 transition-transform",
                                          isExpanded && "rotate-180",
                                        )}
                                      />
                                    </Button>
                                  )}
                                  {!isPaid && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                      onClick={() => handleOpenPayment(txn)}
                                      disabled={!isOnline}
                                    >
                                      <CreditCard className="h-3 w-3 mr-1" />
                                      Pay
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Show partial payment progress */}
                              {isPartial && (
                                <div className="mt-2">
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-green-600">
                                      Paid: ₹{paid.toLocaleString()}
                                    </span>
                                    <span className="text-amber-600">
                                      Pending: ₹{pending.toLocaleString()}
                                    </span>
                                  </div>
                                  {/* Progress bar */}
                                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-green-500 rounded-full transition-all"
                                      style={{
                                        width: `${(paid / total) * 100}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center justify-between mt-2">
                                <p className="text-xs text-muted-foreground">
                                  {new Date(txn.date).toLocaleDateString(
                                    "en-IN",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    },
                                  )}
                                </p>
                                {txn.notes && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                    {txn.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Payment Timeline (Expandable) */}
                            {hasPayments && isExpanded && (
                              <div className="px-3 pb-3 border-t bg-muted/30">
                                <div className="pt-3">
                                  <p className="text-xs font-medium text-muted-foreground mb-2">
                                    Payment History
                                  </p>
                                  <div className="space-y-0">
                                    {txn.payments
                                      .sort(
                                        (a, b) =>
                                          new Date(b.date) - new Date(a.date),
                                      )
                                      .map((payment, index, arr) => (
                                        <div key={payment.id} className="flex">
                                          {/* Timeline line and dot */}
                                          <div className="flex flex-col items-center mr-3">
                                            <div
                                              className={cn(
                                                "w-3 h-3 rounded-full flex items-center justify-center",
                                                index === 0
                                                  ? "bg-green-500"
                                                  : "bg-green-400",
                                              )}
                                            >
                                              <CheckCircle2 className="w-2 h-2 text-white" />
                                            </div>
                                            {index < arr.length - 1 && (
                                              <div className="w-0.5 h-full min-h-[24px] bg-green-300" />
                                            )}
                                          </div>

                                          {/* Payment details */}
                                          <div className="flex-1 pb-3">
                                            <div className="flex items-center gap-2">
                                              <span className="font-semibold text-green-600">
                                                ₹
                                                {payment.amount.toLocaleString()}
                                              </span>
                                              <span className="text-xs text-muted-foreground">
                                                —{" "}
                                                {formatRelativeDate(
                                                  payment.date,
                                                )}
                                              </span>
                                              {payment.receiptUrl && (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Could open receipt in a dialog
                                                  }}
                                                  className="text-xs text-primary hover:underline flex items-center gap-0.5"
                                                >
                                                  <Receipt className="h-3 w-3" />
                                                  Receipt
                                                </button>
                                              )}
                                            </div>
                                            {payment.isFinalPayment && (
                                              <span className="text-xs text-green-600">
                                                Final payment
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Customer Form */}
      {editingCustomer && (
        <CustomerForm
          open={!!editingCustomer}
          onOpenChange={(open) => {
            if (!open) setEditingCustomer(null);
          }}
          onSubmit={handleEditCustomer}
          initialData={editingCustomer}
          title="Edit Customer"
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {customerToDelete?.name} and all
              their Udhar transactions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Viewer */}
      <ImageViewer
        src={imageViewerSrc}
        alt="Profile Picture"
        open={imageViewerOpen}
        onOpenChange={setImageViewerOpen}
      />
    </div>
  );
}
