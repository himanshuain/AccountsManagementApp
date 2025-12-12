"use client";

import Link from "next/link";
import { Building2, Phone, Mail, MapPin, FileText, ChevronRight, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CATEGORY_STYLES = {
  fabric: { bg: "bg-blue-500/10", text: "text-blue-600", label: "Fabric" },
  accessories: { bg: "bg-purple-500/10", text: "text-purple-600", label: "Accessories" },
  premium: { bg: "bg-amber-500/10", text: "text-amber-600", label: "Premium" },
  regular: { bg: "bg-green-500/10", text: "text-green-600", label: "Regular" },
};

export function SupplierCard({ supplier, transactionCount = 0 }) {
  const initials =
    supplier.name
      ?.split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";

  const categoryStyle = supplier.category ? CATEGORY_STYLES[supplier.category] : null;

  return (
    <Link href={`/suppliers/${supplier.id}`}>
      <Card className="group hover:shadow-md transition-all hover:border-primary/50 cursor-pointer card-lift">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <Avatar className="h-14 w-14 border-2 border-primary/10">
              <AvatarImage src={supplier.profilePicture} alt={supplier.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                  {supplier.name}
                </h3>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              </div>

              {supplier.companyName && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                  <Building2 className="h-3.5 w-3.5" />
                  <span className="truncate">{supplier.companyName}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                {supplier.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.gstNumber && (
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    <span>GST: {supplier.gstNumber}</span>
                  </div>
                )}
              </div>

              {/* Category and Transaction badges */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {categoryStyle && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                      categoryStyle.bg,
                      categoryStyle.text
                    )}
                  >
                    <Tag className="h-3 w-3" />
                    {categoryStyle.label}
                  </span>
                )}
                {transactionCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {transactionCount} transaction{transactionCount !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Sync status indicator */}
          {supplier.syncStatus === "pending" && (
            <div className="mt-3 flex items-center gap-1 text-xs text-amber-600">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Pending sync</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export function SupplierCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-full skeleton-shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 rounded skeleton-shimmer" />
            <div className="h-4 w-24 rounded skeleton-shimmer" />
            <div className="h-3 w-20 rounded skeleton-shimmer" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default SupplierCard;
