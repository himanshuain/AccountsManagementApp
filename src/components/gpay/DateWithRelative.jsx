"use client";

import { format } from "date-fns";
import { parseFlexibleDate, getRelativeDayLabel } from "@/lib/date-utils";

/**
 * Renders a formatted date with a relative day label (Today, Yesterday, 3 days ago, …)
 */
export function DateWithRelative({
  date,
  dateFormat = "dd MMM yyyy",
  timeFormat,
  className,
  relativeClassName = "text-muted-foreground",
}) {
  const d = parseFlexibleDate(date);
  if (!d) return null;

  const relative = getRelativeDayLabel(d);

  return (
    <span className={className}>
      {format(d, dateFormat)}
      {timeFormat ? (
        <span className={relativeClassName}> · {format(d, timeFormat)}</span>
      ) : null}
      {relative ? (
        <span className={relativeClassName}> · {relative}</span>
      ) : null}
    </span>
  );
}
