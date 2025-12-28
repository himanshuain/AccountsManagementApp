"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/hooks/useHaptics";

/**
 * GPay-style horizontal scrolling filter chips
 * With dropdown functionality for each chip
 */

export function FilterChips({
  filters = [],
  onFilterChange,
  className
}) {
  return (
    <div className={cn(
      "flex gap-2 overflow-x-auto scrollbar-none py-2 -mx-4 px-4",
      className
    )}>
      {filters.map((filter) => (
        <FilterChip
          key={filter.id}
          {...filter}
          onSelect={(value) => onFilterChange?.(filter.id, value)}
        />
      ))}
    </div>
  );
}

/**
 * Individual filter chip with dropdown
 */
export function FilterChip({
  label,
  value,
  options = [],
  onSelect,
  variant = "default", // "default" | "active"
  className
}) {
  const [open, setOpen] = useState(false);
  const chipRef = useRef(null);
  
  const isActive = value && value !== "all" && value !== "";
  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption?.label || label;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (chipRef.current && !chipRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    
    if (open) {
      document.addEventListener("click", handleClickOutside);
    }
    
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open]);

  const handleChipClick = () => {
    haptics.light();
    if (options.length > 0) {
      setOpen(!open);
    }
  };

  const handleOptionSelect = (optionValue) => {
    haptics.light();
    onSelect?.(optionValue);
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    haptics.light();
    onSelect?.("all");
  };

  return (
    <div ref={chipRef} className="relative">
      {/* Chip Button */}
      <button
        onClick={handleChipClick}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
          "text-sm font-medium whitespace-nowrap",
          "border transition-all active:scale-95",
          isActive
            ? "bg-primary/10 border-primary text-primary"
            : "bg-muted/50 border-border text-foreground hover:bg-muted",
          className
        )}
      >
        <span>{displayLabel}</span>
        
        {isActive ? (
          <button
            onClick={handleClear}
            className="ml-0.5 -mr-1 p-0.5 rounded-full hover:bg-primary/20"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : options.length > 0 ? (
          <ChevronDown className={cn(
            "h-3.5 w-3.5 transition-transform",
            open && "rotate-180"
          )} />
        ) : null}
      </button>

      {/* Dropdown */}
      {open && options.length > 0 && (
        <div className={cn(
          "absolute top-full left-0 mt-1 z-50",
          "min-w-[160px] py-1 rounded-xl",
          "bg-card border shadow-lg",
          "animate-scale-in origin-top-left"
        )}>
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleOptionSelect(option.value)}
              className={cn(
                "flex items-center justify-between w-full px-3 py-2",
                "text-sm text-left",
                "hover:bg-muted transition-colors",
                value === option.value && "text-primary"
              )}
            >
              <span>{option.label}</span>
              {value === option.value && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Segmented control (tab-style filter)
 */
export function SegmentedControl({
  options = [],
  value,
  onChange,
  className
}) {
  return (
    <div className={cn(
      "inline-flex rounded-xl bg-muted p-1",
      className
    )}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => {
            haptics.light();
            onChange?.(option.value);
          }}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-lg transition-all",
            value === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
          {option.count !== undefined && (
            <span className={cn(
              "ml-1.5 text-xs",
              value === option.value ? "text-primary" : "text-muted-foreground"
            )}>
              ({option.count})
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * Search bar with filters
 */
export function SearchWithFilters({
  searchValue,
  onSearchChange,
  placeholder = "Search...",
  filters = [],
  onFilterChange,
  className
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full h-10 px-4 rounded-xl",
            "bg-muted border-0",
            "text-sm placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-primary/20"
          )}
        />
        {searchValue && (
          <button
            onClick={() => onSearchChange?.("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-background"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Filter Chips */}
      {filters.length > 0 && (
        <FilterChips
          filters={filters}
          onFilterChange={onFilterChange}
        />
      )}
    </div>
  );
}

export default FilterChips;

