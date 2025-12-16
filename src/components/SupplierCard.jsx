"use client";

import Link from "next/link";
import { Building2, Phone, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function SupplierCard({ supplier, transactionCount = 0 }) {
  // Show company name prominently, person name secondary
  const displayName = supplier.companyName || supplier.name;
  const secondaryName = supplier.companyName ? supplier.name : null;

  const initials =
    displayName
      ?.split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";

  return (
    <Link href={`/suppliers/${supplier.id}`}>
      <Card className="card-lift hw-accelerate group cursor-pointer transition-all hover:border-primary/50 hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <Avatar className="h-12 w-12 border-2 border-primary/10">
              <AvatarImage src={supplier.profilePicture} alt={displayName} />
              <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate text-base font-semibold transition-colors group-hover:text-primary">
                  {displayName}
                </h3>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>

              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                {secondaryName && <span className="truncate">{secondaryName}</span>}
                {supplier.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
              </div>

              {/* Transaction count */}
              <div className="mt-2 flex items-center gap-2">
                {transactionCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {transactionCount} transaction
                    {transactionCount !== 1 ? "s" : ""}
                  </Badge>
                )}
                {/* Sync status indicator */}
                {supplier.syncStatus === "pending" && (
                  <Badge variant="outline" className="border-amber-500/30 text-xs text-amber-600">
                    <div className="mr-1 h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                    Syncing
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function SupplierCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="skeleton-shimmer h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton-shimmer h-5 w-32 rounded" />
            <div className="skeleton-shimmer h-4 w-24 rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default SupplierCard;
