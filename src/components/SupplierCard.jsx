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
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";

  return (
    <Link href={`/suppliers/${supplier.id}`}>
      <Card className="group hover:shadow-md transition-all hover:border-primary/50 cursor-pointer card-lift hw-accelerate">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <Avatar className="h-12 w-12 border-2 border-primary/10">
              <AvatarImage src={supplier.profilePicture} alt={displayName} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                  {displayName}
                </h3>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              </div>

              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                {secondaryName && (
                  <span className="truncate">{secondaryName}</span>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
              </div>

              {/* Transaction count */}
              <div className="flex items-center gap-2 mt-2">
                {transactionCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {transactionCount} transaction
                    {transactionCount !== 1 ? "s" : ""}
                  </Badge>
                )}
                {/* Sync status indicator */}
                {supplier.syncStatus === "pending" && (
                  <Badge
                    variant="outline"
                    className="text-xs text-amber-600 border-amber-500/30"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1" />
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
          <div className="h-12 w-12 rounded-full skeleton-shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 rounded skeleton-shimmer" />
            <div className="h-4 w-24 rounded skeleton-shimmer" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default SupplierCard;
