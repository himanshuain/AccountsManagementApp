'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Receipt, 
  IndianRupee, 
  Clock, 
  Plus,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import useSuppliers from '@/hooks/useSuppliers';
import useTransactions from '@/hooks/useTransactions';
import { SupplierForm } from '@/components/SupplierForm';
import { TransactionForm } from '@/components/TransactionForm';

export default function DashboardPage() {
  const { suppliers, addSupplier } = useSuppliers();
  const { transactions, addTransaction, getPendingPayments, getRecentTransactions } = useTransactions();
  
  const [pendingPayments, setPendingPayments] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [transactionFormOpen, setTransactionFormOpen] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      const pending = await getPendingPayments();
      const recent = await getRecentTransactions(5);
      setPendingPayments(pending);
      setRecentTransactions(recent);
    };
    loadDashboardData();
  }, [getPendingPayments, getRecentTransactions, transactions]);

  // Calculate stats
  const totalSuppliers = suppliers.length;
  const totalTransactions = transactions.length;
  const pendingAmount = pendingPayments.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.name || 'Unknown';
  };

  const getSupplierInitials = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  const handleAddSupplier = async (data) => {
    await addSupplier(data);
  };

  const handleAddTransaction = async (data) => {
    await addTransaction(data);
  };

  const paymentStatusColors = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    partial: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s your shop overview.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSupplierFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </Button>
          <Button onClick={() => setTransactionFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/suppliers">
          <Card className="cursor-pointer hover:border-blue-500/50 hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalSuppliers}</p>
                  <p className="text-xs text-muted-foreground">Total Suppliers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/transactions">
          <Card className="cursor-pointer hover:border-green-500/50 hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalTransactions}</p>
                  <p className="text-xs text-muted-foreground">Transactions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/transactions?status=pending">
          <Card className="cursor-pointer hover:border-amber-500/50 hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">₹{pendingAmount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/transactions">
          <Card className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">₹{totalAmount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
              <Link href="/transactions">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No transactions yet</p>
                <Button 
                  variant="link" 
                  className="mt-2"
                  onClick={() => setTransactionFormOpen(true)}
                >
                  Add your first transaction
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getSupplierInitials(transaction.supplierId)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {getSupplierName(transaction.supplierId)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">₹{transaction.amount?.toLocaleString()}</p>
                      <Badge className={`text-[10px] ${paymentStatusColors[transaction.paymentStatus]}`}>
                        {transaction.paymentStatus}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Pending Payments</CardTitle>
              <Badge variant="secondary">{pendingPayments.length} pending</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {pendingPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <IndianRupee className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No pending payments</p>
                <p className="text-xs mt-1">All payments are up to date!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingPayments.slice(0, 5).map((payment) => (
                  <div key={payment.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs bg-amber-100 text-amber-700">
                        {getSupplierInitials(payment.supplierId)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {getSupplierName(payment.supplierId)}
                      </p>
                      {payment.dueDate && (
                        <p className="text-xs text-muted-foreground">
                          Due: {new Date(payment.dueDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </p>
                      )}
                    </div>
                    <p className="font-semibold text-amber-600">
                      ₹{payment.amount?.toLocaleString()}
                    </p>
                  </div>
                ))}
                {pendingPayments.length > 5 && (
                  <Link href="/transactions?status=pending">
                    <Button variant="ghost" size="sm" className="w-full">
                      View all {pendingPayments.length} pending
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link href="/suppliers">
              <div className="p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-center">
                <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">View Suppliers</p>
              </div>
            </Link>
            <Link href="/transactions">
              <div className="p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-center">
                <Receipt className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">All Transactions</p>
              </div>
            </Link>
            <div 
              className="p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-center cursor-pointer"
              onClick={() => setSupplierFormOpen(true)}
            >
              <Plus className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">New Supplier</p>
            </div>
            <div 
              className="p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-center cursor-pointer"
              onClick={() => setTransactionFormOpen(true)}
            >
              <IndianRupee className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">New Transaction</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Forms */}
      <SupplierForm
        open={supplierFormOpen}
        onOpenChange={setSupplierFormOpen}
        onSubmit={handleAddSupplier}
      />

      <TransactionForm
        open={transactionFormOpen}
        onOpenChange={setTransactionFormOpen}
        onSubmit={handleAddTransaction}
        suppliers={suppliers}
      />
    </div>
  );
}

