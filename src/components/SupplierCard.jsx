'use client';

import Link from 'next/link';
import { Building2, Phone, Mail, MapPin, FileText, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function SupplierCard({ supplier, transactionCount = 0 }) {
  const initials = supplier.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  return (
    <Link href={`/suppliers/${supplier.id}`}>
      <Card className="group hover:shadow-md transition-all hover:border-primary/50 cursor-pointer">
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

              {/* Transaction badge */}
              {transactionCount > 0 && (
                <Badge variant="secondary" className="mt-2 text-xs">
                  {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>

          {/* Sync status indicator */}
          {supplier.syncStatus === 'pending' && (
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
          <div className="h-14 w-14 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 bg-muted rounded animate-pulse" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-3 w-20 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default SupplierCard;

