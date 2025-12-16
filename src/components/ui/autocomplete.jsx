"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Autocomplete Select Component
 * A searchable dropdown with autocomplete functionality
 * Uses portal to escape overflow containers
 */
export function Autocomplete({
  options = [],
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  disabled = false,
  className,
  triggerClassName,
  dropdownClassName,
  renderOption,
  getOptionLabel = option => option?.label || option?.name || option?.companyName || "",
  getOptionValue = option => option?.value || option?.id || "",
}) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0, width: 0 });
  const triggerRef = React.useRef(null);
  const dropdownRef = React.useRef(null);
  const inputRef = React.useRef(null);

  // Find selected option
  const selectedOption = React.useMemo(() => {
    return options.find(opt => getOptionValue(opt) === value);
  }, [options, value, getOptionValue]);

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(opt => {
      const label = getOptionLabel(opt).toLowerCase();
      const optValue = String(getOptionValue(opt)).toLowerCase();
      return label.includes(query) || optValue.includes(query);
    });
  }, [options, searchQuery, getOptionLabel, getOptionValue]);

  // Calculate dropdown position when opened
  React.useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 200), // Minimum width of 200px
      });
    }
  }, [open]);

  // Close on outside click
  React.useEffect(() => {
    const handleClickOutside = event => {
      if (
        triggerRef.current && 
        !triggerRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setOpen(false);
        setSearchQuery("");
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  // Focus input when opened
  React.useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Close on scroll outside dropdown (to prevent misaligned dropdown)
  React.useEffect(() => {
    const handleScroll = (e) => {
      // Don't close if scrolling inside the dropdown
      if (dropdownRef.current && dropdownRef.current.contains(e.target)) {
        return;
      }
      if (open) {
        setOpen(false);
        setSearchQuery("");
      }
    };

    if (open) {
      window.addEventListener("scroll", handleScroll, true);
    }

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  const handleSelect = optValue => {
    onValueChange(optValue === value ? "" : optValue);
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <div className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground",
          triggerClassName
        )}
      >
        <span className="flex-1 truncate text-left">
          {selectedOption ? getOptionLabel(selectedOption) : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown - Rendered via Portal */}
      {open && typeof window !== "undefined" && createPortal(
        <div 
          ref={dropdownRef}
          className={cn(
            "fixed z-[100] rounded-md border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95",
            dropdownClassName
          )}
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
          }}
        >
          {/* Search Input */}
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="rounded p-1 hover:bg-muted"
              >
                <X className="h-4 w-4 opacity-50" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
            ) : (
              filteredOptions.map(option => {
                const optValue = getOptionValue(option);
                const optLabel = getOptionLabel(option);
                const isSelected = optValue === value;

                return (
                  <button
                    key={optValue}
                    type="button"
                    onClick={() => handleSelect(optValue)}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none",
                      "hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent"
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {renderOption ? (
                      renderOption(option, isSelected)
                    ) : (
                      <span className="truncate">{optLabel}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default Autocomplete;
