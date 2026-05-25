"use client";

import { format } from "date-fns";
import { parseFlexibleDate, getRelativeDayLabel } from "@/lib/date-utils";

const TIME_RELATIVE_CLASS = "text-[11px] text-muted-foreground/50";

/**
 * Renders date, optional time, then relative label (Today, Yesterday, …).
 * Order: date · time · relative — time and relative are smaller and muted.
 */
export function DateWithRelative({
  date,
  dateFormat = "dd MMM yyyy",
  timeFormat,
  timeFrom,
  className,
  timeRelativeClassName = TIME_RELATIVE_CLASS,
}) {
  const d = parseFlexibleDate(date);
  const timeSource = parseFlexibleDate(timeFrom || date);
  if (!d && !timeSource) return null;

  const relative = getRelativeDayLabel(d || timeSource);
  const showDate = !!d;
  const showTime = !!timeFormat && !!timeSource;
  const sep = <span className={timeRelativeClassName}> · </span>;

  return (
    <span className={className}>
      {showDate && <span>{format(d, dateFormat)}</span>}
      {showTime && (
        <>
          {showDate && sep}
          <span className={timeRelativeClassName}>{format(timeSource, timeFormat)}</span>
        </>
      )}
      {relative && (
        <>
          {(showDate || showTime) && sep}
          <span className={timeRelativeClassName}>{relative}</span>
        </>
      )}
    </span>
  );
}
