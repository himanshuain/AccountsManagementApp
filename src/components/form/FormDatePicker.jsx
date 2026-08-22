"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  subMonths,
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  isAfter,
  startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  formatDisplayDate,
  getLocalDate,
  parseFlexibleDate,
  toDateValue,
} from "@/lib/date-utils";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function CalendarPanel({ value, onChange, maxDate, onDone }) {
  const maxValue = maxDate || getLocalDate();
  const maxDateObj = parseFlexibleDate(maxValue);
  const selected = parseFlexibleDate(value);
  const [viewMonth, setViewMonth] = useState(() => selected || new Date());

  useEffect(() => {
    if (selected) setViewMonth(selected);
  }, [value]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    const monthDays = eachDayOfInterval({ start, end });
    return { leadingBlanks: start.getDay(), monthDays };
  }, [viewMonth]);

  const viewMonthStart = startOfMonth(viewMonth);
  const maxMonthStart = maxDateObj ? startOfMonth(maxDateObj) : null;
  const canGoNext = !maxMonthStart || viewMonthStart < maxMonthStart;

  const isDisabledDay = day => {
    if (!day || !maxDateObj) return true;
    return isAfter(startOfDay(day), startOfDay(maxDateObj));
  };

  const handleSelect = day => {
    if (isDisabledDay(day)) return;
    onChange?.(toDateValue(day));
    onDone?.();
  };

  const handleToday = () => {
    const today = new Date();
    if (isDisabledDay(today)) return;
    onChange?.(getLocalDate());
    setViewMonth(today);
    onDone?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setViewMonth(prev => subMonths(prev, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold tracking-tight">{format(viewMonth, "MMMM yyyy")}</p>
        <button
          type="button"
          aria-label="Next month"
          disabled={!canGoNext}
          onClick={() => canGoNext && setViewMonth(prev => addMonths(prev, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7">
        {WEEKDAYS.map(day => (
          <div
            key={day}
            className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: calendarDays.leadingBlanks }).map((_, i) => (
          <div key={`blank-${i}`} aria-hidden />
        ))}
        {calendarDays.monthDays.map(day => {
          const isSelected = selected && isSameDay(day, selected);
          const isTodayDate = isToday(day);
          const dayDisabled = isDisabledDay(day);

          return (
            <button
              key={toDateValue(day)}
              type="button"
              disabled={dayDisabled}
              onClick={() => handleSelect(day)}
              className={cn(
                "flex h-9 w-full items-center justify-center rounded-lg text-sm transition-colors",
                isSelected && "bg-foreground font-semibold text-background",
                !isSelected && isTodayDate && "font-semibold ring-1 ring-border",
                !isSelected && !isTodayDate && !dayDisabled && "hover:bg-muted",
                dayDisabled && "cursor-not-allowed text-muted-foreground/30"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end border-t border-border/50 pt-2">
        <button
          type="button"
          onClick={handleToday}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Today
        </button>
      </div>
    </div>
  );
}

export function FormDatePicker({
  value,
  onChange,
  disabled = false,
  error,
  id,
  className,
  maxDate,
  placeholder = "Pick a date",
}) {
  const [open, setOpen] = useState(false);
  const selected = parseFlexibleDate(value);
  const displayText = selected ? formatDisplayDate(value) : placeholder;

  return (
    <div className={cn("space-y-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            aria-expanded={open}
            aria-haspopup="dialog"
            className={cn(
              "input-hero flex h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm",
              disabled && "cursor-not-allowed opacity-50",
              error && "border-destructive/50"
            )}
          >
            <span
              className={cn(
                "truncate",
                selected ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {displayText}
            </span>
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={6}
          className="w-[min(calc(100vw-2rem),320px)] rounded-2xl border border-border/60 p-3 shadow-lg"
        >
          <CalendarPanel
            value={value}
            onChange={onChange}
            maxDate={maxDate}
            onDone={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
}
