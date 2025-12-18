"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Lightweight debug logger for debug mode (NDJSON to provided endpoint)
const logAutocomplete = (payload) => {
  fetch("http://127.0.0.1:7245/ingest/cde8c359-2ac1-4713-9a87-cbd976795216", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: "debug-session",
      runId: "pre-fix",
      timestamp: Date.now(),
      ...payload,
    }),
  }).catch(() => {});
};

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

  // Global focus tracker to see where focus ends up
  React.useEffect(() => {
    const handler = e => {
      // #region agent log
      logAutocomplete({
        hypothesisId: "E",
        location: "autocomplete.jsx:focusin",
        message: "Document focusin",
        data: { target: e.target?.tagName, active: document.activeElement?.tagName, open },
      });
      // #endregion
    };
    document.addEventListener("focusin", handler, true);
    return () => document.removeEventListener("focusin", handler, true);
  }, [open]);

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
      // #region agent log
      logAutocomplete({
        hypothesisId: "A",
        location: "autocomplete.jsx:openEffect",
        message: "Dropdown opened; computed position",
        data: { top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 200) },
      });
      // #endregion
    }
    // #region agent log
    logAutocomplete({
      hypothesisId: "F",
      location: "autocomplete.jsx:openState",
      message: "Open state changed",
      data: { open },
    });
    // #endregion
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
        // #region agent log
        logAutocomplete({
          hypothesisId: "G",
          location: "autocomplete.jsx:clickOutside",
          message: "Click outside detected, closing dropdown",
          data: { target: event.target?.tagName, open },
        });
        // #endregion
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
        // #region agent log
        logAutocomplete({
          hypothesisId: "G",
          location: "autocomplete.jsx:scrollClose",
          message: "Scroll detected, closing dropdown",
          data: { target: e.target?.tagName },
        });
        // #endregion
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
        onClick={() => {
          // #region agent log
          logAutocomplete({
            hypothesisId: "B",
            location: "autocomplete.jsx:triggerClick",
            message: "Trigger clicked",
            data: { disabled, openBefore: open },
          });
          // #endregion
          if (!disabled) setOpen(!open);
        }}
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
            "fixed z-[9999] rounded-md border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95 pointer-events-auto",
            dropdownClassName
          )}
          onMouseDownCapture={e => e.stopPropagation()}
          onTouchStartCapture={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
          }}
          onFocusCapture={e => {
            // #region agent log
            logAutocomplete({
              hypothesisId: "C",
              location: "autocomplete.jsx:dropdownFocus",
              message: "Dropdown focus capture",
              data: { target: e.target?.tagName },
            });
            // #endregion
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
              onMouseDownCapture={e => {
                // #region agent log
                logAutocomplete({
                  hypothesisId: "D",
                  location: "autocomplete.jsx:searchMouseDownCapture",
                  message: "Search input mousedown capture",
                  data: {
                    defaultPrevented: e.defaultPrevented,
                    button: e.button,
                    open,
                  },
                });
                // #endregion
                e.stopPropagation();
              }}
              onTouchStartCapture={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              onTouchStart={e => e.stopPropagation()}
              onFocus={e => {
                // #region agent log
                logAutocomplete({
                  hypothesisId: "D",
                  location: "autocomplete.jsx:searchFocus",
                  message: "Search input focus",
                  data: {
                    value: searchQuery,
                    target: e.target?.tagName,
                    activeBefore: document.activeElement?.tagName,
                    open,
                  },
                });
                // #endregion
              }}
              onClick={e => {
                // #region agent log
                logAutocomplete({
                  hypothesisId: "D",
                  location: "autocomplete.jsx:searchClick",
                  message: "Search input click",
                  data: {
                    value: searchQuery,
                    activeBefore: document.activeElement?.tagName,
                    open,
                  },
                });
                // #endregion
              }}
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
