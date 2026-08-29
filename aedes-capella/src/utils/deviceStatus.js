export const STATUS_PRESENTATION = {
  online: { label: 'Working', color: 'green', tone: 'healthy' },
  stale: { label: 'Check soon', color: 'amber', tone: 'warning' },
  // "Not reporting" read as a sensor that was powered and merely quiet, which
  // is the one thing this state does not claim. "Offline" is the plainer word
  // for the same evidence. It still does not assert a cause: the plan is
  // explicit that offline means no update arrived, not that the unit is off or
  // broken, which is why the description under it keeps saying so.
  offline: { label: 'Offline', color: 'gray', tone: 'offline' },
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

export function describeDetector(device) {
  /*
   * The S3 transmits only when a detection passes the decision policy; there is
   * no keepalive. So a Gate-4 packet arriving is positive evidence the detector
   * is alive, and no packet arriving is evidence of nothing at all. These labels
   * refuse to turn that silence into either reassurance or an alarm.
   *
   * detector_down is only reachable once firmware reports s3_last_packet_age_ms.
   */
  switch (device.detector_state) {
    case 'confirmed_live':
      return {
        label: 'Detecting',
        color: 'green',
        // No note. "A reading reached the hub recently" was the chip again in
        // a longer sentence, and a badge beside a sentence saying the same
        // thing is what made this row read as broken layout.
        detail: null,
      };
    case 'detector_down':
      return {
        label: 'Not responding',
        color: 'red',
        detail: 'The sensor has stopped hearing from its microphone unit.',
      };
    case 'silent_unverifiable':
      return {
        label: 'Nothing heard recently',
        color: 'gray',
        detail: device.detector_reporting_supported
          ? null
          : 'Normal on a quiet night. This sensor cannot yet tell quiet apart from stopped.',
      };
    case 'never_confirmed':
      return {
        label: 'Never detected yet',
        color: 'gray',
        detail: 'This sensor has never sent a reading.',
      };
    default:
      return { label: 'No update yet', color: 'gray', detail: null };
  }
}

export function describeDeviceState(device) {
  if (device.operational_state === 'logging_fault') {
    return 'The sensor is sending a signal, but some records may not be saved. Treat its information as incomplete until a later healthy update.';
  }
  if (device.operational_state === 'never_seen') {
    return 'This sensor is listed but has never sent an update.';
  }
  /*
   * These deliberately say only what is known. The card no longer shows the
   * frozen heartbeat snapshot by default, so there is nothing here to
   * disclaim; the "Last online status" view carries its own note.
   */
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
