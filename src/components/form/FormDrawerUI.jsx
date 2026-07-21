"use client";

import { Loader2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DrawerHeader, DrawerTitle } from "@/components/ui/drag-close-drawer";
import { cn } from "@/lib/utils";

export const MUI_AUTOCOMPLETE_SX = {
  "& .MuiOutlinedInput-root": {
    backgroundColor: "transparent",
    color: "hsl(var(--foreground))",
    borderRadius: "0.75rem",
    "& fieldset": { borderColor: "transparent" },
    "&:hover fieldset": { borderColor: "transparent" },
    "&.Mui-focused fieldset": { borderColor: "transparent" },
  },
  "& .MuiInputLabel-root": {
    color: "hsl(var(--muted-foreground))",
    "&.Mui-focused": { color: "hsl(var(--primary))" },
  },
  "& .MuiInputBase-input": { color: "hsl(var(--foreground))", padding: "0 !important" },
  "& .MuiAutocomplete-endAdornment .MuiSvgIcon-root": {
    color: "hsl(var(--muted-foreground))",
  },
};

export const AUTOCOMPLETE_POPPER_PROPS = {
  popper: {
    disablePortal: false,
    sx: { zIndex: 2147483647 },
    container: typeof document !== "undefined" ? document.body : undefined,
    modifiers: [{ name: "preventOverflow", enabled: false }],
  },
  paper: {
    elevation: 8,
    sx: {
      mt: 1,
      bgcolor: "hsl(var(--card))",
      color: "hsl(var(--card-foreground))",
      border: "1px solid hsl(var(--border))",
      pointerEvents: "auto",
      "& .MuiAutocomplete-listbox": {
        padding: "4px",
        pointerEvents: "auto",
        "& .MuiAutocomplete-option": {
          minHeight: 48,
          borderRadius: "6px",
          color: "hsl(var(--foreground))",
          pointerEvents: "auto",
          cursor: "pointer",
          "&:hover": { bgcolor: "hsl(var(--accent))" },
          '&[aria-selected="true"]': { bgcolor: "hsl(var(--primary) / 0.1)" },
          "&.Mui-focused": { bgcolor: "hsl(var(--accent))" },
        },
      },
      "& .MuiAutocomplete-noOptions": { color: "hsl(var(--muted-foreground))" },
    },
  },
};

export const NO_SPIN_INPUT =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

export function FormSection({
  title,
  icon: Icon,
  children,
  className,
  iconClassName,
  titleClassName,
  bodyClassName,
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm",
        className
      )}
    >
      {title && (
        <div className="flex items-center gap-2 border-b border-border/40 px-4 py-2.5">
          {Icon && <Icon className={cn("h-4 w-4 text-muted-foreground", iconClassName)} />}
          <p
            className={cn(
              "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
              titleClassName
            )}
          >
            {title}
          </p>
        </div>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function SegmentToggle({ value, onChange, options, disabled }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/50 p-1">
      {options.map(opt => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-lg py-2.5 text-sm font-semibold transition-all active:scale-[0.98]",
              isActive
                ? opt.activeClass || "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
              disabled && "opacity-50"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function FormDrawerHeader({
  title,
  icon: Icon,
  subtitle,
  onClose,
  onSubmit,
  isSubmitting,
  isEdit,
  canSubmit = true,
}) {
  return (
    <DrawerHeader className="border-b border-border/50 px-4 pb-3 pt-0">
      <div className="flex w-full items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          disabled={isSubmitting}
          className="h-9 w-9 shrink-0"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </Button>
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center">
          <DrawerTitle className="flex items-center justify-center gap-2 text-base">
            {Icon && <Icon className="h-4 w-4 text-primary" />}
            {title}
          </DrawerTitle>
          {subtitle && (
            <p className="mt-0.5 max-w-[220px] truncate text-sm font-medium text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        <Button size="sm" onClick={onSubmit} disabled={!canSubmit} className="h-9 shrink-0 px-3">
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Check className="mr-1 h-4 w-4" />
              {isEdit ? "Save" : "Add"}
            </>
          )}
        </Button>
      </div>
    </DrawerHeader>
  );
}

export function OfflineBanner() {
  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
      You&apos;re offline. Saving is disabled until you reconnect.
    </div>
  );
}

export function FormSubmitButton({ children, disabled, isSubmitting }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="btn-hero flex h-12 w-full items-center justify-center gap-2 disabled:opacity-50"
    >
      {isSubmitting ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Saving…
        </>
      ) : (
        children
      )}
    </button>
  );
}
