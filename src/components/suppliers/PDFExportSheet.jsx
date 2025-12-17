"use client";

import { FileText } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { exportSupplierTransactionsPDF } from "@/lib/export";
import { toast } from "sonner";

export function PDFExportSheet({
  open,
  onOpenChange,
  suppliers,
  transactions,
}) {
  const handleExport = (supplier) => {
    const supplierTransactions = transactions.filter(t => t.supplierId === supplier.id);
    if (supplierTransactions.length === 0) {
      toast.error("No transactions to export");
      return;
    }
    try {
      exportSupplierTransactionsPDF(supplier, supplierTransactions);
      toast.success(`PDF exported for ${supplier.companyName}`);
      onOpenChange(false);
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error("Failed to export PDF");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl p-0" hideClose>
        {/* Drag handle */}
        <div className="flex justify-center pb-2 pt-3" data-drag-handle>
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        <SheetHeader className="border-b px-4 pb-3">
          <SheetTitle className="text-lg">Export PDF Report</SheetTitle>
          <p className="text-sm text-muted-foreground">
            Select a vyapari to export their transaction report
          </p>
        </SheetHeader>

        <ScrollArea className="h-[calc(70vh-100px)] flex-1">
          <div className="space-y-2 p-4">
            {suppliers.map(supplier => {
              const supplierTransactions = transactions.filter(t => t.supplierId === supplier.id);
              return (
                <button
                  key={supplier.id}
                  onClick={() => handleExport(supplier)}
                  className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all hover:bg-muted/50 active:scale-[0.99] touch-manipulation"
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "h-12 w-12 flex-shrink-0 rounded-full p-0.5",
                      supplier.pendingAmount > 0
                        ? "bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500"
                        : "bg-gradient-to-tr from-green-400 via-emerald-500 to-teal-500"
                    )}
                  >
                    <div className="h-full w-full rounded-full bg-background p-0.5">
                      {supplier.profilePicture ? (
                        <img
                          src={supplier.profilePicture}
                          alt={supplier.companyName}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/10">
                          <span className="text-lg font-bold text-primary">
                            {supplier.companyName?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{supplier.companyName}</p>
                    <p className="text-xs text-muted-foreground">
                      {supplierTransactions.length} transactions • ₹
                      {supplier.totalAmount.toLocaleString()}
                    </p>
                  </div>

                  {/* Export icon */}
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

