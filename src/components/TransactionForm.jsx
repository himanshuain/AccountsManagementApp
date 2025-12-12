'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MultiImageUpload } from './ImageUpload';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

export function TransactionForm({ 
  open, 
  onOpenChange, 
  onSubmit, 
  suppliers = [],
  initialData = null,
  defaultSupplierId = null,
  quickCaptureData = null,
  title = 'Add Transaction'
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billImages, setBillImages] = useState(initialData?.billImages || []);
  const [pendingFiles, setPendingFiles] = useState([]); // For quick capture files
  const [selectedSupplierId, setSelectedSupplierId] = useState(
    initialData?.supplierId || defaultSupplierId || ''
  );
  const [paymentStatus, setPaymentStatus] = useState(initialData?.paymentStatus || 'pending');
  const [paymentMode, setPaymentMode] = useState(initialData?.paymentMode || 'cash');

  // Handle quick capture data when dialog opens
  useEffect(() => {
    if (open && quickCaptureData) {
      setSelectedSupplierId(quickCaptureData.supplierId);
      setPendingFiles(quickCaptureData.images || []);
      // Create preview URLs for the captured images
      const previews = quickCaptureData.images?.map(file => URL.createObjectURL(file)) || [];
      setBillImages(previews);
    }
  }, [open, quickCaptureData]);

  const { register, handleSubmit, control, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: initialData || {
      date: new Date().toISOString().split('T')[0],
      amount: '',
      items: [{ name: '', quantity: 1, rate: 0 }],
      dueDate: '',
      notes: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  // Watch items to calculate total
  const items = watch('items');
  const totalAmount = items?.reduce((sum, item) => {
    return sum + (Number(item.quantity) * Number(item.rate));
  }, 0) || 0;

  useEffect(() => {
    setValue('amount', totalAmount);
  }, [totalAmount, setValue]);

  const handleFormSubmit = async (data) => {
    if (!selectedSupplierId) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload pending files first (from quick capture)
      let uploadedUrls = [];
      if (pendingFiles.length > 0) {
        for (const file of pendingFiles) {
          try {
            const formData = new FormData();
            formData.append('file', file);
            
            const response = await fetch('/api/upload', {
              method: 'POST',
              body: formData
            });
            
            if (response.ok) {
              const { url } = await response.json();
              uploadedUrls.push(url);
            } else {
              // Keep local preview if upload fails
              const localUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
              });
              uploadedUrls.push(localUrl);
            }
          } catch (error) {
            console.error('File upload failed:', error);
          }
        }
      }

      // Combine uploaded URLs with existing billImages (for non-quick capture)
      const finalBillImages = pendingFiles.length > 0 ? uploadedUrls : billImages;

      await onSubmit({
        ...data,
        supplierId: selectedSupplierId,
        paymentStatus,
        paymentMode,
        billImages: finalBillImages,
        amount: totalAmount
      });
      reset();
      setBillImages([]);
      setPendingFiles([]);
      setSelectedSupplierId(defaultSupplierId || '');
      setPaymentStatus('pending');
      setPaymentMode('cash');
      onOpenChange(false);
    } catch (error) {
      console.error('Submit failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      setBillImages(initialData?.billImages || []);
      setPendingFiles([]);
      setSelectedSupplierId(initialData?.supplierId || defaultSupplierId || '');
      setPaymentStatus(initialData?.paymentStatus || 'pending');
      setPaymentMode(initialData?.paymentMode || 'cash');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Update transaction details' : 'Record a new transaction with a supplier'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6">
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 py-4">
            {/* Supplier & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <Select 
                  value={selectedSupplierId} 
                  onValueChange={setSelectedSupplierId}
                  disabled={!!defaultSupplierId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  {...register('date', { required: 'Date is required' })}
                />
              </div>
            </div>

            <Separator />

            {/* Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Items</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ name: '', quantity: 1, rate: 0 })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Item Name</Label>
                      <Input
                        {...register(`items.${index}.name`)}
                        placeholder="Item name"
                      />
                    </div>
                    <div className="w-20 space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                        placeholder="1"
                      />
                    </div>
                    <div className="w-28 space-y-1">
                      <Label className="text-xs">Rate (₹)</Label>
                      <Input
                        type="number"
                        {...register(`items.${index}.rate`, { valueAsNumber: true })}
                        placeholder="0"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <div className="bg-muted px-4 py-2 rounded-lg">
                  <span className="text-sm text-muted-foreground">Total: </span>
                  <span className="font-semibold">₹{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Payment Info */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  {...register('dueDate')}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                {...register('notes')}
                placeholder="Additional notes..."
              />
            </div>

            <Separator />

            {/* Bill Images */}
            <div className="space-y-2">
              <Label>
                Bill Images
                {pendingFiles.length > 0 && (
                  <span className="ml-2 text-xs text-primary font-normal">
                    ({pendingFiles.length} captured)
                  </span>
                )}
              </Label>
              {pendingFiles.length > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {billImages.map((url, index) => (
                      <div key={index} className="relative aspect-video rounded-lg overflow-hidden border bg-muted ring-2 ring-primary/50">
                        <img
                          src={url}
                          alt={`Captured bill ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">
                          Captured
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {pendingFiles.length} bill(s) will be uploaded when you save
                  </p>
                </div>
              ) : (
                <MultiImageUpload
                  value={billImages}
                  onChange={setBillImages}
                  maxImages={5}
                />
              )}
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(handleFormSubmit)} disabled={isSubmitting || !selectedSupplierId}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Update' : 'Add Transaction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TransactionForm;

