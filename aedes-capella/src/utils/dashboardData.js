import {
  AudioLines,
  CircleDot,
  FlaskConical,
  Power,
  SprayCan,
  Timer,
} from 'lucide-react';
// Explicit extension: this module runs under `node --test`, whose ESM resolver
// does not fill one in the way Vite does.
import { DETECTION_TERM } from '../constants/terminology.js';

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

// Presentation follows the four-color legend in PaletteGuide.
const ACTIVITY_TIME_QUALITY = Object.freeze({
  ntp: Object.freeze({ label: 'Confirmed time', tone: 'green' }),
  boot_anchor: Object.freeze({ label: 'Estimated time', tone: 'gray' }),
  unresolved: Object.freeze({ label: 'Time unavailable', tone: 'gray' }),
});

const UNRESOLVED_ACTIVITY_TIME = ACTIVITY_TIME_QUALITY.unresolved;

export const OPERATOR_ACTIVITY_KINDS = Object.freeze([
  'BOOT',
  'LIVE_ACCEPT',
  'RELAY_ON',
  'RELAY_REJECT',
]);

const OPERATOR_ACTIVITY_KIND_SET = new Set(OPERATOR_ACTIVITY_KINDS);

// Presentation follows the four-color legend in PaletteGuide.
const EVENT_PRESENTATION = {
  BOOT: { label: 'Device turned on', color: 'green', icon: Power },
  TEST_ACCEPT: { label: 'Test check', color: 'gray', icon: FlaskConical },
  LIVE_ACCEPT: { label: DETECTION_TERM.singular, color: 'green', icon: AudioLines },
  RELAY_INTENT: { label: 'Spray requested', color: 'red', icon: SprayCan },
  RELAY_ON: { label: 'Sprayer turned on', color: 'red', icon: SprayCan },
  RELAY_OFF: { label: 'Sprayer turned off', color: 'red', icon: SprayCan },
  RELAY_REJECT: { label: 'Sprayer on cooldown', color: 'amber', icon: Timer },
  COOLDOWN_COMPLETE: { label: 'Ready again', color: 'gray', icon: Timer },
};

/*
 * Firmware reason codes leak straight from the device ring into the UI
 * (timer_armed, candidate, validated, reset). They are engineering shorthand,
 * so translate the known ones and pass anything unrecognised through rather
 * than inventing a meaning for it.
 */
const REASON_TEXT = {
  reset: 'The device restarted.',
  cooldown_observation: 'Still heard during the wait after a spray. Not counted again.',
  cooldown_observatio: 'Still heard during the wait after a spray. Not counted again.',
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

/*
 * LIVE_ACCEPT reasons that are not a new detection.
 *
 * window_summary is the 30 s status packet that was shipped under LIVE_ACCEPT
 * before 2026-09-04. cooldown_observation is newer firmware noting, about a
 * second after a spray, that it still hears the sound while the 120 s cooldown
 * runs. It never arms the relay and is the same sound as the detection just
 * before it, so counting it doubled that unit's detections. The C3 stores the
 * reason in a 20-byte field, so the row reads 'cooldown_observatio'; both
 * spellings are listed so a firmware with a wider field stays excluded.
 *
 * Must stay in step with migration 202610010001_exclude_cooldown_observations.
 */
export const NON_DETECTION_ACCEPT_REASONS = Object.freeze([
  'window_summary',
  'cooldown_observation',
  'cooldown_observatio',
]);

const NON_DETECTION_ACCEPT_REASON_SET = new Set(NON_DETECTION_ACCEPT_REASONS);
const COOLDOWN_OBSERVATION_REASONS = new Set(['cooldown_observation', 'cooldown_observatio']);

export function isCooldownObservation(event) {
  return event?.event_kind === 'LIVE_ACCEPT'
    && COOLDOWN_OBSERVATION_REASONS.has(event?.reason);
}

/*
 * A counted detection. The server's temporal_candidate is the authority; the
 * reason check keeps a cooldown observation out even if the open tab is
 * holding a row from before the migration was applied.
 */
export function isDetectionCandidate(event) {
  return Boolean(event?.temporal_candidate)
    && !NON_DETECTION_ACCEPT_REASON_SET.has(event?.reason);
}

const COOLDOWN_OBSERVATION_PRESENTATION = Object.freeze({
  label: 'Heard again while waiting', color: 'gray', icon: Timer,
});

export function getEventPresentation(eventKind, reason) {
  if (isCooldownObservation({ event_kind: eventKind, reason })) {
    return COOLDOWN_OBSERVATION_PRESENTATION;
  }
  return EVENT_PRESENTATION[eventKind]
    || { label: 'Other activity', color: 'gray', icon: CircleDot };
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

/*
 * The instant the current Manila day began.
 *
 * "Today" on this dashboard means since midnight in Manila, which is not the
 * same answer as "the last 24 hours" for all but one instant of the day, and
 * is the one a barangay health worker means when she opens the page in the
 * morning and asks what happened.
 *
 * Philippine Standard Time is a flat UTC+8 with no daylight saving, so the day
 * boundary is arithmetic rather than a timezone-database lookup: shift into
 * Manila, floor to the day, shift back.
 *
 * @param {number} [now] - injectable clock, for tests
 * @returns {number} epoch milliseconds of 00:00 Asia/Manila today
 */
export function manilaStartOfDay(now = Date.now()) {
  const shifted = now + MANILA_OFFSET_MS;
  return (Math.floor(shifted / DAY_MS) * DAY_MS) - MANILA_OFFSET_MS;
}

export function average(values) {
  const numeric = values.filter(value => value !== null && value !== undefined).map(Number).filter(Number.isFinite);
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
  const raw = candidate?.candidate_score ?? candidate?.p_aedes;
  if (raw === null || raw === undefined || raw === '') return null;
  const score = Number(raw);
  return Number.isFinite(score) && score >= 0 && score <= 1 ? score * 100 : null;
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
    candidateCount: operatorEvents.filter(isDetectionCandidate).length,
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
  const buckets = MATCH_STRENGTH_BANDS;

  return buckets.map(bucket => ({
    range: bucket.range,
    label: bucket.label,
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

// Existing distribution boundaries. These describe score bands, not the 0.35 firmware gate.
export const MATCH_STRENGTH_BANDS = Object.freeze([
  { range: '0-59%', label: 'Weak match', min: 0, max: 60 },
  { range: '60-79%', label: 'Possible match', min: 60, max: 80 },
  { range: '80-89%', label: 'Strong match', min: 80, max: 90 },
  { range: '90-100%', label: 'Very strong match', min: 90, max: 101 },
]);

export function matchStrengthLabel(scorePercent) {
  if (scorePercent === null || scorePercent === undefined || !Number.isFinite(scorePercent) || scorePercent < 0 || scorePercent > 100) return 'Not available';
  return MATCH_STRENGTH_BANDS.find(band => scorePercent >= band.min && scorePercent < band.max)?.label || 'Not available';
}
