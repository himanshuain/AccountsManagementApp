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
import { Label } from "@/components/ui/label";
import useCustomers from "@/hooks/useCustomers";
import useUdhar from "@/hooks/useUdhar";
import useOnlineStatus from "@/hooks/useOnlineStatus";
import { CustomerForm } from "@/components/CustomerForm";
import { UdharForm } from "@/components/UdharForm";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function CustomersPage() {
  const isOnline = useOnlineStatus();
  const { customers, addCustomer, loading: customersLoading } = useCustomers();
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
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";
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
      {customersWithStats.length > 0 && (
        <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <p className="text-xs text-muted-foreground">Total Udhar</p>
                <p className="text-lg font-bold">
                  ₹
                  {customersWithStats
                    .reduce((sum, c) => sum + c.totalAmount, 0)
                    .toLocaleString()}
                </p>
              </div>
              <div className="h-8 w-px bg-amber-500/20" />
              <div className="text-center flex-1">
                <p className="text-xs text-green-600">Collected</p>
                <p className="text-lg font-bold text-green-600">
                  ₹
                  {customersWithStats
                    .reduce((sum, c) => sum + c.paidAmount, 0)
                    .toLocaleString()}
                </p>
              </div>
              <div className="h-8 w-px bg-amber-500/20" />
              <div className="text-center flex-1">
                <p className="text-xs text-amber-600">Pending</p>
                <p className="text-lg font-bold text-amber-600">
                  ₹
                  {customersWithStats
                    .reduce((sum, c) => sum + c.pendingAmount, 0)
                    .toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                "overflow-hidden transition-all hover:shadow-md",
                customer.pendingAmount > 0
                  ? "border-l-4 border-l-amber-500"
                  : "border-l-4 border-l-green-500",
              )}
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
        onSubmit={newCustomerWithAmount ? handleAddCustomerWithAmount : addCustomer}
        title={newCustomerWithAmount ? "Add Customer with Udhar" : "Add Customer"}
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
    </div>
  );
}

