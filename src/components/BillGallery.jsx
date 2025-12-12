'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  User,
  Calendar,
  IndianRupee,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function BillGallery({ transactions, suppliers }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [allBills, setAllBills] = useState([]);

  // Flatten all bills from all transactions
  useEffect(() => {
    const bills = [];
    transactions.forEach(transaction => {
      if (transaction.billImages && transaction.billImages.length > 0) {
        transaction.billImages.forEach((imageUrl, index) => {
          bills.push({
            url: imageUrl,
            transaction: transaction,
            supplier: suppliers.find(s => s.id === transaction.supplierId),
            index: index
          });
        });
      }
    });
    setAllBills(bills);
  }, [transactions, suppliers]);

  const currentIndex = allBills.findIndex(b => b.url === selectedImage);

  const openLightbox = (bill) => {
    setSelectedImage(bill.url);
    setSelectedTransaction(bill.transaction);
    setZoom(1);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
    setSelectedTransaction(null);
    setZoom(1);
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const prevBill = allBills[currentIndex - 1];
      setSelectedImage(prevBill.url);
      setSelectedTransaction(prevBill.transaction);
      setZoom(1);
    }
  };

  const goToNext = () => {
    if (currentIndex < allBills.length - 1) {
      const nextBill = allBills[currentIndex + 1];
      setSelectedImage(nextBill.url);
      setSelectedTransaction(nextBill.transaction);
      setZoom(1);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.5, 0.5));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedImage) return;
      
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, currentIndex]);

  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.name || 'Unknown';
  };

  const paymentStatusColors = {
    paid: 'bg-green-500/20 text-green-400',
    pending: 'bg-amber-500/20 text-amber-400',
    partial: 'bg-blue-500/20 text-blue-400',
  };

  if (allBills.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <IndianRupee className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No bill images uploaded yet</p>
        <p className="text-sm mt-1">Upload bills when adding transactions</p>
      </div>
    );
  }

  return (
    <>
      {/* Gallery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {allBills.map((bill, index) => (
          <Card 
            key={`${bill.transaction.id}-${bill.index}`}
            className="group cursor-pointer overflow-hidden hover:ring-2 hover:ring-primary transition-all"
            onClick={() => openLightbox(bill)}
          >
            <div className="aspect-[4/3] relative bg-muted">
              <img
                src={bill.url}
                alt={`Bill from ${getSupplierName(bill.transaction.supplierId)}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              {/* Overlay with info */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-white text-xs font-medium truncate">
                    {getSupplierName(bill.transaction.supplierId)}
                  </p>
                  <p className="text-white/70 text-[10px]">
                    ₹{bill.transaction.amount?.toLocaleString()}
                  </p>
                </div>
              </div>
              {/* Zoom icon */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-black/50 rounded-full p-1.5">
                  <ZoomIn className="h-3 w-3 text-white" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-4">
              <span className="text-white/70 text-sm">
                {currentIndex + 1} of {allBills.length}
              </span>
              {selectedTransaction && (
                <Link href={`/suppliers/${selectedTransaction.supplierId}`}>
                  <Button variant="outline" size="sm" className="gap-2 border-white/20 text-white hover:bg-white/10">
                    <User className="h-4 w-4" />
                    {getSupplierName(selectedTransaction.supplierId)}
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="text-white hover:bg-white/10"
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
              <span className="text-white/70 text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="text-white hover:bg-white/10"
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeLightbox}
                className="text-white hover:bg-white/10 ml-4"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Image container */}
          <div className="flex-1 relative overflow-auto flex items-center justify-center p-4">
            {/* Previous button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-30 z-10"
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>

            {/* Image */}
            <div 
              className="overflow-auto max-h-full max-w-full"
              style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
            >
              <img
                src={selectedImage}
                alt="Bill"
                className="max-h-[70vh] object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
              />
            </div>

            {/* Next button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNext}
              disabled={currentIndex === allBills.length - 1}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-30 z-10"
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </div>

          {/* Footer with transaction details */}
          {selectedTransaction && (
            <div className="p-4 border-t border-white/10 bg-black/50">
              <div className="max-w-2xl mx-auto flex flex-wrap items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-white/70">
                  <Calendar className="h-4 w-4" />
                  {new Date(selectedTransaction.date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </div>
                <div className="flex items-center gap-2 text-white">
                  <IndianRupee className="h-4 w-4" />
                  <span className="font-semibold">₹{selectedTransaction.amount?.toLocaleString()}</span>
                </div>
                <Badge className={cn(paymentStatusColors[selectedTransaction.paymentStatus])}>
                  {selectedTransaction.paymentStatus?.charAt(0).toUpperCase() + selectedTransaction.paymentStatus?.slice(1)}
                </Badge>
                {selectedTransaction.notes && (
                  <span className="text-white/50 text-xs max-w-xs truncate">
                    {selectedTransaction.notes}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Thumbnail strip */}
          <div className="p-3 border-t border-white/10 bg-black/80 overflow-x-auto">
            <div className="flex gap-2 justify-center min-w-max">
              {allBills.map((bill, index) => (
                <button
                  key={`thumb-${bill.transaction.id}-${bill.index}`}
                  onClick={() => {
                    setSelectedImage(bill.url);
                    setSelectedTransaction(bill.transaction);
                    setZoom(1);
                  }}
                  className={cn(
                    'h-12 w-16 rounded overflow-hidden border-2 transition-all flex-shrink-0',
                    bill.url === selectedImage 
                      ? 'border-primary ring-2 ring-primary/50' 
                      : 'border-transparent opacity-50 hover:opacity-100'
                  )}
                >
                  <img
                    src={bill.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BillGallery;

