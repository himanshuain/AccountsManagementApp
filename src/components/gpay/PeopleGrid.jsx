"use client";

import { useState, useMemo } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PersonAvatarWithName, PersonAvatarSkeleton } from "./PersonAvatar";

/**
 * GPay-style people grid with 4-column layout
 * Shows avatars with names and pending amounts
 */

const DEFAULT_VISIBLE_COUNT = 8; // 2 rows of 4

export function PeopleGrid({
  people = [],
  title = "People",
  onPersonClick,
  onAddClick,
  loading = false,
  showPendingAmount = true,
  emptyMessage = "No people yet",
  className
}) {
  const [expanded, setExpanded] = useState(false);
  
  // Sort by pending amount (highest first) then by name
  const sortedPeople = useMemo(() => {
    return [...people].sort((a, b) => {
      const amountA = a.pendingAmount || 0;
      const amountB = b.pendingAmount || 0;
      if (amountB !== amountA) return amountB - amountA;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [people]);

  const visiblePeople = expanded 
    ? sortedPeople 
    : sortedPeople.slice(0, DEFAULT_VISIBLE_COUNT);
  
  const hasMore = sortedPeople.length > DEFAULT_VISIBLE_COUNT;
  const remainingCount = sortedPeople.length - DEFAULT_VISIBLE_COUNT;

  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center justify-between px-1">
          <div className="h-5 w-20 skeleton-shimmer rounded" />
        </div>
        <div className="grid grid-cols-4 gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 p-2">
              <PersonAvatarSkeleton size="lg" />
              <div className="h-3 w-14 skeleton-shimmer rounded mt-1" />
              <div className="h-2.5 w-10 skeleton-shimmer rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (people.length === 0) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">{emptyMessage}</p>
          {onAddClick && (
            <button
              onClick={onAddClick}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium active:scale-95 transition-transform"
            >
              <Plus className="h-4 w-4" />
              Add New
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
        {hasMore && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="text-xs text-primary font-medium flex items-center gap-1 active:opacity-70"
          >
            More
            <ChevronDown className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-4 gap-0.5">
        {visiblePeople.map((person) => (
          <PersonAvatarWithName
            key={person.id}
            name={person.name || person.companyName}
            image={person.profilePicture}
            amount={showPendingAmount ? person.pendingAmount : undefined}
            amountColor={
              person.pendingAmount > 0 
                ? "text-amber-500 dark:text-amber-400" 
                : person.totalAmount > 0 
                  ? "text-emerald-500 dark:text-emerald-400"
                  : "text-muted-foreground"
            }
            size="lg"
            onClick={() => onPersonClick?.(person)}
          />
        ))}

        {/* Add New Button */}
        {onAddClick && (
          <div
            className={cn(
              "flex flex-col items-center gap-1.5 p-2",
              "active:scale-95 transition-transform cursor-pointer",
              "rounded-xl hover:bg-muted/50"
            )}
            onClick={onAddClick}
          >
            <div className="h-16 w-16 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <Plus className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-xs text-muted-foreground">Add New</p>
          </div>
        )}

        {/* More Button (within grid) */}
        {hasMore && !expanded && remainingCount > 0 && (
          <div
            className={cn(
              "flex flex-col items-center gap-1.5 p-2",
              "active:scale-95 transition-transform cursor-pointer",
              "rounded-xl hover:bg-muted/50"
            )}
            onClick={() => setExpanded(true)}
          >
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <ChevronDown className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">+{remainingCount}</p>
          </div>
        )}
      </div>

      {/* Collapse Button */}
      {expanded && hasMore && (
        <button
          onClick={() => setExpanded(false)}
          className="w-full py-2 text-xs text-primary font-medium flex items-center justify-center gap-1 active:opacity-70"
        >
          Show Less
          <ChevronDown className="h-3 w-3 rotate-180" />
        </button>
      )}
    </div>
  );
}

/**
 * Compact people row (horizontal scroll)
 */
export function PeopleRow({
  people = [],
  title = "Recent",
  onPersonClick,
  loading = false,
  className
}) {
  if (loading) {
    return (
      <div className={cn("space-y-2", className)}>
        <h3 className="text-sm font-semibold text-muted-foreground px-1">{title}</h3>
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <PersonAvatarSkeleton size="md" />
              <div className="h-3 w-12 skeleton-shimmer rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (people.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <h3 className="text-sm font-semibold text-muted-foreground px-1">{title}</h3>
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2 -mx-4 px-4">
        {people.map((person) => (
          <PersonAvatarWithName
            key={person.id}
            name={person.name || person.companyName}
            image={person.profilePicture}
            size="md"
            onClick={() => onPersonClick?.(person)}
            className="flex-shrink-0"
          />
        ))}
      </div>
    </div>
  );
}

export default PeopleGrid;

