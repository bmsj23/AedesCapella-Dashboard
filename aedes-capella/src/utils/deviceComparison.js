export const COMPARISON_WINDOWS = Object.freeze([
  { key: '24h', label: '24 HOURS', hours: 24 },
  { key: '7d', label: '7 DAYS', hours: 24 * 7 },
  { key: '30d', label: '30 DAYS', hours: 24 * 30 },
]);

export const AGREEMENT_WINDOW_MS = 60_000;

function eventTime(row) {
  return Date.parse(row?.display_time || row?.started_at || row?.occurred_at || '');
}

function rowsForDevice(rows, deviceId, since, now) {
  return rows
    .filter(row => row.device_id === deviceId)
    .map(row => ({ row, time: eventTime(row) }))
    .filter(entry => Number.isFinite(entry.time) && entry.time >= since && entry.time <= now)
    .sort((a, b) => a.time - b.time);
}

export function countCoincidentCandidates(leftRows, rightRows, windowMs = AGREEMENT_WINDOW_MS) {
  let left = 0;
  let right = 0;
  let matches = 0;

  while (left < leftRows.length && right < rightRows.length) {
    const delta = leftRows[left].time - rightRows[right].time;
    if (Math.abs(delta) <= windowMs) {
      matches += 1;
      left += 1;
      right += 1;
    } else if (delta < 0) {
      left += 1;
    } else {
      right += 1;
    }
  }
  return matches;
}

export function buildDeviceComparison({
  candidates = [],
  relays = [],
  leftDeviceId,
  rightDeviceId,
  hours = 24,
  now = Date.now(),
}) {
  const since = now - hours * 60 * 60 * 1000;
  const leftCandidates = rowsForDevice(candidates, leftDeviceId, since, now);
  const rightCandidates = rowsForDevice(candidates, rightDeviceId, since, now);
  const leftRelays = rowsForDevice(relays, leftDeviceId, since, now);
  const rightRelays = rowsForDevice(relays, rightDeviceId, since, now);
  const matches = countCoincidentCandidates(leftCandidates, rightCandidates);
  const union = leftCandidates.length + rightCandidates.length - matches;

  return {
    since,
    until: now,
    agreementWindowSeconds: AGREEMENT_WINDOW_MS / 1000,
    matchedCandidates: matches,
    agreementPercent: union ? (matches / union) * 100 : null,
    devices: [
      {
        deviceId: leftDeviceId,
        candidates: leftCandidates.length,
        candidatesPerHour: leftCandidates.length / hours,
        relayActivations: leftRelays.length,
      },
      {
        deviceId: rightDeviceId,
        candidates: rightCandidates.length,
        candidatesPerHour: rightCandidates.length / hours,
        relayActivations: rightRelays.length,
      },
    ],
  };
}
