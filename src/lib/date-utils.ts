/**
 * Date and Timezone Utilities
 * Standard application timezone: Asia/Kolkata (IST - UTC+05:30)
 */

export const APP_TIMEZONE = "Asia/Kolkata";

/**
 * Returns formatted calendar date string "YYYY-MM-DD" in the specified timezone
 */
export function getCalendarDateString(
  timestamp: number = Date.now(),
  timeZone: string = APP_TIMEZONE,
): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date(timestamp));
}

/**
 * Returns the Unix millisecond timestamp for 00:00:00.000 of the given calendar day in the target timezone.
 */
export function getStartOfDay(
  timestamp: number = Date.now(),
  timeZone: string = APP_TIMEZONE,
): number {
  const dateStr = getCalendarDateString(timestamp, timeZone); // "YYYY-MM-DD"
  const [year, month, day] = dateStr.split("-").map(Number);

  // UTC midnight for the given YYYY-MM-DD
  const approxUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);

  // Determine timezone offset at that date
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });

  const parts = formatter.formatToParts(new Date(approxUtc));
  const getPart = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value || 0);

  const tzHour = getPart("hour");
  const tzMinute = getPart("minute");
  const tzDay = getPart("day");

  let diffMs = (tzHour * 3600 + tzMinute * 60) * 1000;
  if (tzDay !== day) {
    diffMs +=
      (tzDay > day || (day > 25 && tzDay === 1) ? 1 : -1) * 86400000;
  }

  return approxUtc - diffMs;
}

/**
 * Returns the Unix millisecond timestamp for 00:00:00.000 of the next calendar day.
 */
export function getStartOfNextDay(
  timestamp: number = Date.now(),
  timeZone: string = APP_TIMEZONE,
): number {
  return getStartOfDay(timestamp, timeZone) + 24 * 60 * 60 * 1000;
}

/**
 * Returns the Unix millisecond timestamp for 23:59:59.999 of the current calendar day.
 */
export function getEndOfDay(
  timestamp: number = Date.now(),
  timeZone: string = APP_TIMEZONE,
): number {
  return getStartOfNextDay(timestamp, timeZone) - 1;
}

/**
 * Returns the milliseconds remaining until exactly 12:00:00.000 AM midnight in the target timezone.
 */
export function getMsUntilMidnight(
  timestamp: number = Date.now(),
  timeZone: string = APP_TIMEZONE,
): number {
  const nextMidnight = getStartOfNextDay(timestamp, timeZone);
  return Math.max(0, nextMidnight - timestamp);
}

/**
 * Checks if two timestamps fall on the same calendar day in the target timezone.
 */
export function isSameCalendarDay(
  t1: number,
  t2: number,
  timeZone: string = APP_TIMEZONE,
): boolean {
  return getCalendarDateString(t1, timeZone) === getCalendarDateString(t2, timeZone);
}
