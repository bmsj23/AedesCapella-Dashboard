const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MANILA_OFFSET_MS = 8 * HOUR_MS;

export const ACTIVITY_TABLE_HEADERS = Object.freeze([
  'WHEN IT HAPPENED',
  'WHEN RECEIVED',
  'DEVICE',
  'WHAT HAPPENED',
  'NOTES',
]);

const ACTIVITY_TIME_QUALITY = Object.freeze({
  ntp: Object.freeze({ label: 'Confirmed time', tone: 'green' }),
  boot_anchor: Object.freeze({ label: 'Estimated time', tone: 'gray' }),
  unresolved: Object.freeze({ label: 'Time unavailable', tone: 'amber' }),
});

const UNRESOLVED_ACTIVITY_TIME = ACTIVITY_TIME_QUALITY.unresolved;

export const OPERATOR_ACTIVITY_KINDS = Object.freeze([
  'BOOT',
  'LIVE_ACCEPT',
  'RELAY_ON',
  'RELAY_REJECT',
]);

const OPERATOR_ACTIVITY_KIND_SET = new Set(OPERATOR_ACTIVITY_KINDS);

/*
 * Plain-language event names.
 *
 * The audience is barangay health workers, not engineers, so nothing here may
 * assume familiarity with relays, models or firmware. The hedging survives the
 * simplification though: a possible match must never read as a confirmed
 * mosquito, and a sprayer switching on must never read as proof that spray
 * reached anything.
 */
const EVENT_PRESENTATION = {
  BOOT: { label: 'Device turned on', color: 'blue' },
  TEST_ACCEPT: { label: 'Test check', color: 'gray' },
  LIVE_ACCEPT: { label: 'Likely Aedes Mosquito', color: 'amber' },
  RELAY_INTENT: { label: 'Spray requested', color: 'amber' },
  RELAY_ON: { label: 'Sprayer turned on', color: 'red' },
  RELAY_OFF: { label: 'Sprayer turned off', color: 'green' },
  RELAY_REJECT: { label: 'Sprayer on cooldown', color: 'red' },
  COOLDOWN_COMPLETE: { label: 'Ready again', color: 'green' },
};

/*
 * Firmware reason codes leak straight from the device ring into the UI
 * (timer_armed, candidate, validated, reset). They are engineering shorthand,
 * so translate the known ones and pass anything unrecognised through rather
 * than inventing a meaning for it.
 */
const REASON_TEXT = {
  reset: 'The device restarted.',
  timer_armed: 'The sprayer was switched on.',
  candidate: 'A sound matched. Needs a person to check.',
  validated: 'The sound passed the checks.',
  cooldown: 'Still waiting before it can spray again.',
  cooldown_active: 'Too soon after the last spray.',
  log_unhealthy: 'The device could not save records properly.',
};

export function plainReason(reason) {
  if (!reason) return 'The device recorded this.';
  return REASON_TEXT[reason] || reason;
}

export function getEventPresentation(eventKind) {
  return EVENT_PRESENTATION[eventKind] || { label: 'Other activity', color: 'gray' };
}

export function isOperatorActivityEvent(event) {
  return OPERATOR_ACTIVITY_KIND_SET.has(event?.event_kind);
}

export function filterOperatorActivity(events = []) {
  return events.filter(isOperatorActivityEvent);
}

export function formatDashboardTimestamp(value) {
  if (!value) return 'No timestamp';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid timestamp';
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Manila',
  }).format(date);
}

export function formatShortDashboardTimestamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid';
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Manila',
  }).format(date);
}

function activityUploadDelay(occurredAt, receivedAt) {
  const occurred = Date.parse(occurredAt || '');
  const received = Date.parse(receivedAt || '');
  if (!Number.isFinite(occurred) || !Number.isFinite(received)
      || received <= occurred + 5 * 60 * 1000) return null;
  const minutes = Math.round((received - occurred) / 60000);
  return minutes >= 60 ? `${Math.round(minutes / 60)}h late` : `${minutes}m late`;
}

export function getActivityTimePresentation(event = {}) {
  const happenedAt = event.occurred_at || null;
  const receivedAt = event.received_at || null;
  const delay = activityUploadDelay(happenedAt, receivedAt);
  const quality = ACTIVITY_TIME_QUALITY[event.time_quality]
    || UNRESOLVED_ACTIVITY_TIME;

  return {
    happenedAt,
    happenedLabel: happenedAt
      ? formatShortDashboardTimestamp(happenedAt)
      : 'Unavailable',
    happenedTitle: happenedAt
      ? formatDashboardTimestamp(happenedAt)
      : 'Recorded time unavailable',
    receivedAt,
    receivedLabel: formatShortDashboardTimestamp(receivedAt),
    receivedTitle: formatDashboardTimestamp(receivedAt),
    qualityLabel: quality.label,
    qualityTone: quality.tone,
    delay,
  };
}

export function average(values) {
  const numeric = values.map(Number).filter(Number.isFinite);
  return numeric.length
    ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length
    : null;
}

export function countSince(rows, timestampKey, since) {
  return rows.filter(row => {
    const timestamp = new Date(row?.[timestampKey]).getTime();
    return Number.isFinite(timestamp) && timestamp >= since;
  }).length;
}

export function candidateScorePercent(candidate) {
  const score = Number(candidate?.candidate_score ?? candidate?.p_aedes);
  return Number.isFinite(score) ? score * 100 : null;
}

export function buildRuntimeSummary(events, now = Date.now()) {
  const operatorEvents = filterOperatorActivity(events);
  const since24h = now - DAY_MS;
  const latestAt = operatorEvents.reduce((latest, event) => {
    const timestamp = new Date(event?.display_time).getTime();
    return Number.isFinite(timestamp) && timestamp > latest.timestamp
      ? { timestamp, value: event.display_time }
      : latest;
  }, { timestamp: Number.NEGATIVE_INFINITY, value: null }).value;

  return {
    total: operatorEvents.length,
    last24h: countSince(operatorEvents, 'display_time', since24h),
    candidateCount: operatorEvents.filter(event => event.temporal_candidate).length,
    relayCount: operatorEvents.filter(event => event.relay_energized).length,
    unresolvedCount: operatorEvents.filter(event => event.time_quality === 'unresolved').length,
    latestAt,
  };
}

function formatBucket(timestamp, unit) {
  const date = new Date(timestamp);
  if (unit === HOUR_MS) {
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short', day: '2-digit', hour: '2-digit', hour12: false,
      timeZone: 'Asia/Manila',
    }).format(date);
  }
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short', day: '2-digit', timeZone: 'Asia/Manila',
  }).format(date);
}

function buildFilledSeries(rows, timestampKey, count, unit, now) {
  const shiftedNow = now + MANILA_OFFSET_MS;
  const currentBucket = Math.floor(shiftedNow / unit) * unit - MANILA_OFFSET_MS;
  const starts = Array.from({ length: count }, (_, index) => (
    currentBucket - ((count - index - 1) * unit)
  ));
  const totals = new Array(count).fill(0);

  rows.forEach(row => {
    const timestamp = new Date(row?.[timestampKey]).getTime();
    if (!Number.isFinite(timestamp)) return;
    const index = Math.floor((timestamp - starts[0]) / unit);
    if (index >= 0 && index < count) totals[index] += 1;
  });

  return starts.map((start, index) => ({
    start,
    t: formatBucket(start, unit),
    v: totals[index],
  }));
}

export function buildActivitySeries(candidates, view, now = Date.now()) {
  if (view === 'today') return buildFilledSeries(candidates, 'display_time', 24, HOUR_MS, now);
  if (view === 'week') return buildFilledSeries(candidates, 'display_time', 7, DAY_MS, now);
  return buildFilledSeries(candidates, 'display_time', 30, DAY_MS, now);
}

export function buildHourlyRelaySeries(relays, now = Date.now()) {
  const started = relays.filter(relay => relay.started_at);
  return buildFilledSeries(started, 'started_at', 12, HOUR_MS, now)
    .map(point => ({ hour: point.t, relays: point.v, start: point.start }));
}

export function buildConfidenceDistribution(candidates) {
  const buckets = [
    { range: '0–59%', min: 0, max: 60 },
    { range: '60–79%', min: 60, max: 80 },
    { range: '80–89%', min: 80, max: 90 },
    { range: '90–100%', min: 90, max: 101 },
  ];

  return buckets.map(bucket => ({
    range: bucket.range,
    count: candidates.filter(candidate => {
      const score = candidateScorePercent(candidate);
      return score !== null && score >= bucket.min && score < bucket.max;
    }).length,
  }));
}

export function buildNodeActivity(events, deviceLabels = {}) {
  const counts = new Map();
  events.forEach(event => {
    const key = event.device_id || 'unknown';
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts, ([deviceId, count]) => ({
    node: deviceLabels[deviceId] || deviceId.slice(0, 8),
    count,
  })).sort((a, b) => b.count - a.count);
}

export function formatRelayStatus(status) {
  return ({
    requested: 'Requested',
    started: 'Activation recorded',
    stopped: 'Stop recorded',
    rejected: 'Rejected',
    cooldown_complete: 'Cooldown completed',
  })[status] || 'Recorded';
}

export function isDisplayableRelayEpisode(episode) {
  return Boolean(
    episode?.requested_at
    || episode?.started_at
    || episode?.stopped_at
    || episode?.rejected_at,
  );
}

export function deriveRelayEpisodes(events) {
  const relayKinds = new Set(['RELAY_INTENT', 'RELAY_ON', 'RELAY_OFF', 'RELAY_REJECT', 'COOLDOWN_COMPLETE']);
  const episodes = new Map();

  events.filter(event => relayKinds.has(event.event_kind)).forEach(event => {
    const key = `${event.device_id}:${event.source_boot}:${event.source_sequence}`;
    const episode = episodes.get(key) || {
      relay_episode_key: key,
      device_id: event.device_id,
      source_boot: event.source_boot,
      source_sequence: event.source_sequence,
    };
    const eventTime = event.occurred_at || event.received_at || event.display_time;
    if (event.event_kind === 'RELAY_INTENT') episode.requested_at = eventTime;
    if (event.event_kind === 'RELAY_ON') episode.started_at = eventTime;
    if (event.event_kind === 'RELAY_OFF') episode.stopped_at = eventTime;
    if (event.event_kind === 'RELAY_REJECT') {
      episode.rejected_at = eventTime;
      episode.rejection_reason = event.reason;
    }
    if (event.event_kind === 'COOLDOWN_COMPLETE') episode.cooldown_completed_at = eventTime;
    episodes.set(key, episode);
  });

  return Array.from(episodes.values()).map(episode => {
    const relayStatus = episode.rejected_at
      ? 'rejected'
      : episode.stopped_at ? 'stopped'
        : episode.started_at ? 'started'
          : episode.requested_at ? 'requested' : 'cooldown_complete';
    const started = new Date(episode.started_at).getTime();
    const stopped = new Date(episode.stopped_at).getTime();
    return {
      ...episode,
      relay_status: relayStatus,
      recorded_relay_activation: Boolean(episode.started_at),
      duration_seconds: Number.isFinite(started) && Number.isFinite(stopped)
        ? Math.max(0, (stopped - started) / 1000)
        : null,
    };
  }).filter(isDisplayableRelayEpisode);
}
