"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Users,
  Search,
  IndianRupee,
  Phone,
  Calendar,
  ChevronRight,
  Edit,
  Trash2,
  ArrowLeft,
  MapPin,
  Banknote,
  CheckCircle,
  Clock,
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

export default function CustomersPage() {
  const isOnline = useOnlineStatus();
  const {
    customers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    loading: customersLoading,
  } = useCustomers();
  const { udharList, addUdhar, loading: udharLoading } = useUdhar();

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
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded" />
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
          {filteredCustomers.map((customer) => (
            <Card
              key={customer.id}
              className={cn(
                "overflow-hidden transition-all hover:shadow-md cursor-pointer active:scale-[0.99]",
                customer.pendingAmount > 0
                  ? "border-l-4 border-l-amber-500"
                  : "border-l-4 border-l-green-500",
              )}
              onClick={() => setSelectedCustomer(customer)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={customer.profilePicture} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getCustomerInitials(customer.name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{customer.name}</p>
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

                  {/* Quick Add Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3 text-xs gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isOnline) {
                        toast.error("Cannot add while offline");
                        return;
                      }
                      setQuickAddCustomer(customer);
                      setQuickAddOpen(true);
                    }}
                    disabled={!isOnline}
                  >
                    <Plus className="h-3 w-3" />
                    Udhar
                  </Button>

                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Customer Form */}
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
                      setCustomerFormOpen(true);
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
                  <Avatar className="h-16 w-16">
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
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {selectedCustomerTransactions.map((txn) => {
                        const total =
                          txn.amount ||
                          (txn.cashAmount || 0) + (txn.onlineAmount || 0);
                        const paid =
                          txn.paidAmount ||
                          (txn.paidCash || 0) + (txn.paidOnline || 0);
                        const pending = Math.max(0, total - paid);
                        const isPaid = txn.paymentStatus === "paid";

                        return (
                          <div
                            key={txn.id}
                            className={cn(
                              "p-3 rounded-lg border",
                              isPaid
                                ? "bg-green-500/5 border-green-500/20"
                                : "bg-amber-500/5 border-amber-500/20",
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {isPaid ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Clock className="h-4 w-4 text-amber-500" />
                                )}
                                <span className="font-semibold">
                                  ₹{total.toLocaleString()}
                                </span>
                              </div>
                              <Badge
                                variant={isPaid ? "default" : "secondary"}
                                className={cn(
                                  "text-xs",
                                  isPaid
                                    ? "bg-green-100 text-green-700"
                                    : "bg-amber-100 text-amber-700",
                                )}
                              >
                                {isPaid ? "Paid" : `₹${pending} pending`}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between mt-1">
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
          open={customerFormOpen && !!editingCustomer}
          onOpenChange={(open) => {
            setCustomerFormOpen(open);
            if (!open) setEditingCustomer(null);
          }}
          onSubmit={handleEditCustomer}
          customer={editingCustomer}
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
    </div>
  );
}
