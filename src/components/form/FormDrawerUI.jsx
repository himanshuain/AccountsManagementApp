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
        "overflow-hidden rounded-2xl border border-black/[0.12] bg-card shadow-sm dark:border-white/[0.12] dark:shadow-none dark:ring-1 dark:ring-white/[0.08]",
        className
      )}
    >
      {title && (
        <div className="flex items-center gap-2 border-b border-black/[0.08] px-4 py-2.5 dark:border-white/[0.08]">
          {Icon && (
            <Icon
              className={cn("h-4 w-4 text-muted-foreground", iconClassName)}
              strokeWidth={1.5}
            />
          )}
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
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/50 p-1 dark:bg-muted/80">
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
                ? opt.activeClass ||
                  "bg-background text-foreground shadow-sm dark:bg-card dark:shadow-none dark:ring-1 dark:ring-white/[0.1]"
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
  /** Matches bottom FormSubmitButton when set (e.g. "Save changes", "Add transaction") */
  actionLabel,
  canSubmit = true,
}) {
  const primaryLabel = actionLabel ?? (isEdit ? "Save" : "Add");

  return (
    <DrawerHeader className="border-b border-black/[0.1] px-4 pb-3 pt-0 dark:border-white/[0.1]">
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
            {Icon && <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />}
            {title}
          </DrawerTitle>
          {subtitle && (
            <p className="mt-0.5 max-w-[220px] truncate text-sm font-medium text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {onSubmit ? (
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={!canSubmit || isSubmitting}
            className="h-9 max-w-[42%] shrink-0 px-2.5 sm:max-w-[50%] sm:px-3"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="mr-1 h-4 w-4 shrink-0" strokeWidth={2} />
                <span className="truncate text-xs font-medium sm:text-sm">{primaryLabel}</span>
              </>
            )}
          </Button>
        ) : (
          <div className="h-9 w-9 shrink-0" aria-hidden />
        )}
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
