const DAY_MS = 86_400_000;
const OFFSET_MS = 8 * 3_600_000;

export function manilaDate(now = Date.now()) {
  return new Date(now + OFFSET_MS).toISOString().slice(0, 10);
}

function formatDay(ms, includeYear = true) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila', weekday: 'short', day: 'numeric', month: 'short',
    ...(includeYear ? { year: 'numeric' } : {}),
  }).format(ms).replaceAll(',', '').replace('Sept', 'Sep');
}

// Date inputs carry calendar dates, never the computer's local timezone.
export function activityWindow(scope, date, cutoffMs, now = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const midnight = Date.parse(`${date}T00:00:00+08:00`);
  if (!Number.isFinite(midnight) || manilaDate(midnight) !== date
      || date > manilaDate(now)
      || (Number.isFinite(cutoffMs) && date < manilaDate(cutoffMs))) return null;
  const mondayOffset = scope === 'week'
    ? (new Date(midnight + OFFSET_MS).getUTCDay() + 6) % 7 : 0;
  const start = midnight - mondayOffset * DAY_MS;
  const end = start + (scope === 'week' ? 7 : 1) * DAY_MS;
  // A cutoff can fall inside the first week or even inside a day.
  const effectiveStart = Math.max(start, cutoffMs);
  const label = scope === 'week'
    ? `${formatDay(start, false)} to ${formatDay(end - DAY_MS)}`
    : formatDay(start);
  return {
    startIso: new Date(effectiveStart).toISOString(),
    endIso: new Date(end).toISOString(),
    label,
    emptyTitle: scope === 'week' ? 'Nothing recorded in that week' : `Nothing recorded on ${label}`,
    cutoffApplied: effectiveStart > start,
  };
}
