"use client";

import { format } from "date-fns";
import { parseFlexibleDate, getRelativeDayLabel } from "@/lib/date-utils";

const RELATIVE_SUBTLE_CLASS = "text-muted-foreground/45";

/**
 * Renders date, optional time, then relative label (Today, Yesterday, …).
 * Order: date · time · relative — relative uses a subtler color.
 */
export function DateWithRelative({
  date,
  dateFormat = "dd MMM yyyy",
  timeFormat,
  timeFrom,
  className,
  relativeClassName = RELATIVE_SUBTLE_CLASS,
}) {
  const d = parseFlexibleDate(date);
  const timeSource = parseFlexibleDate(timeFrom || date);
  if (!d && !timeSource) return null;

  const relative = getRelativeDayLabel(d || timeSource);
  const showDate = !!d;
  const showTime = !!timeFormat && !!timeSource;

  return (
    <span className={className}>
      {showDate && <span>{format(d, dateFormat)}</span>}
      {showTime && (
        <>
          {showDate && <span> · </span>}
          <span>{format(timeSource, timeFormat)}</span>
        </>
      )}
      {relative && (
        <>
          {(showDate || showTime) && <span> · </span>}
          <span className={relativeClassName}>{relative}</span>
        </>
      )}
    </span>
  );
}
