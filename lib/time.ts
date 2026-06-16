/**
 * LogIt timezone helpers — the app is single-tenant for SME Lagos Mainland,
 * so all "today" calculations are in Lagos local time (UTC+1, no DST).
 *
 * Without this, around 23:00 UTC the app would still think today is yesterday
 * for Lagos users, mis-labelling chart bars and querying the wrong report_date.
 */

const LAGOS_OFFSET_MS = 60 * 60 * 1000; // UTC+1

export function lagosDate(d: Date = new Date()): string {
  const shifted = new Date(d.getTime() + LAGOS_OFFSET_MS);
  return shifted.toISOString().slice(0, 10);
}

export function lagosYesterday(d: Date = new Date()): string {
  return lagosDate(new Date(d.getTime() - 86_400_000));
}

/**
 * 23:59 Lagos of the given Lagos date, expressed as a UTC ISO string.
 * Used by the nightly cron when back-dating closed_at to end-of-day.
 */
export function endOfLagosDayUtc(lagosDateStr: string): string {
  // 23:59 Lagos = 22:59 UTC of the same date
  return `${lagosDateStr}T22:59:00.000Z`;
}
