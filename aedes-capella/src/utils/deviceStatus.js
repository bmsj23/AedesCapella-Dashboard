export const STATUS_PRESENTATION = {
  online: { label: 'Working', color: 'green', tone: 'healthy' },
  stale: { label: 'Check soon', color: 'amber', tone: 'warning' },
  offline: { label: 'Not reporting', color: 'gray', tone: 'offline' },
  never_seen: { label: 'Not connected yet', color: 'blue', tone: 'startup' },
  logging_fault: { label: 'Records may be missing', color: 'red', tone: 'critical' },
};

export function getStatusPresentation(state) {
  return STATUS_PRESENTATION[state] || STATUS_PRESENTATION.never_seen;
}

export function formatDuration(milliseconds) {
  if (milliseconds === null || milliseconds === undefined) return '—';
  const totalMinutes = Math.floor(Number(milliseconds) / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return days ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m`;
}

export function formatTimestamp(value) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Manila',
  }).format(new Date(value));
}

/**
 * Plain-language reading of the unit's upload backlog.
 *
 * `unsent_records` is the difference between the newest record the unit says it
 * wrote and the newest record the server received, so it answers a question no
 * other field on the card answers: is this unit holding records it cannot send?
 * A unit whose heartbeat succeeds while its uploads fail looks healthy
 * everywhere else.
 *
 * Three readings must stay distinct, which is why null is not folded into zero:
 *
 *   null  the unit has never reported, so there is nothing to say
 *   0     everything the unit wrote has arrived
 *   n     n records are still on the unit
 *
 * The amber escalation is decided in the database (`unsent_backlog_state`), not
 * here. It needs backlog depth, age, and a live heartbeat together, so a unit
 * that is merely offline keeps its one existing offline reading instead of
 * raising a second alarm for the same fact.
 *
 * @param {object} device - a `dashboard_device_status` row
 * @param {number} [nowMs] - injectable clock, for tests
 * @returns {{label: string, color: string, detail: string|null}}
 */
export function describeUploadBacklog(device, nowMs = Date.now()) {
  const state = device.unsent_backlog_state;
  const count = device.unsent_records;

  if (state === 'unknown' || count === null || count === undefined) {
    return { label: 'Not reported yet', color: 'gray', detail: null };
  }
  if (Number(count) === 0) {
    return { label: 'All records sent', color: 'green', detail: null };
  }

  const stalled = state === 'stalled';
  const since = device.oldest_unsent_at ? new Date(device.oldest_unsent_at).getTime() : null;
  const waited = since === null || Number.isNaN(since) ? null : nowMs - since;

  return {
    label: `${count} waiting to send`,
    color: stalled ? 'amber' : 'blue',
    // The server cannot date a record it never received, so this is stated as
    // silence since the last arrival rather than as the age of the oldest
    // pending record.
    detail: waited === null || waited < 0
      ? null
      : `Nothing received for ${formatDuration(waited)}`,
  };
}

export function describeDeviceState(device) {
  if (device.operational_state === 'logging_fault') {
    return 'The sensor is sending a signal, but some records may not be saved. Treat its information as incomplete until a later healthy update.';
  }
  if (device.operational_state === 'never_seen') {
    return 'This sensor is listed but has never sent an update.';
  }
  if (device.operational_state === 'stale') {
    return `No update received within the ${device.stale_after_minutes}-minute check period.`;
  }
  if (device.operational_state === 'offline') {
    return `No update received within the ${device.offline_after_minutes}-minute offline period.`;
  }
  // Reachable only while the sensor is still checking in: the database raises
  // 'stalled' for a live heartbeat with a backlog that is not draining. Without
  // this branch the card would read "sending updates normally" inside an amber
  // plate, because a stalled backlog now counts toward needs_attention.
  if (device.unsent_backlog_state === 'stalled') {
    return `This sensor is checking in, but ${device.unsent_records} of its saved records have not reached the dashboard. The records are still on the sensor; its connection may be reaching the check-in service only.`;
  }
  return `This sensor is sending updates normally (about every ${device.expected_heartbeat_cadence_minutes} minutes).`;
}
