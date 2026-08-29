import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIVITY_TABLE_HEADERS,
  buildActivitySeries,
  buildConfidenceDistribution,
  buildRuntimeSummary,
  deriveRelayEpisodes,
  getActivityTimePresentation,
  getEventPresentation,
} from './dashboardData.js';
import { DETECTION_TERM } from '../constants/terminology.js';

test('unresolved activity never presents receipt time as when it happened', () => {
  const receivedAt = '2026-08-14T12:34:56Z';
  const presentation = getActivityTimePresentation({
    occurred_at: null,
    received_at: receivedAt,
    time_quality: 'unresolved',
  });

  assert.equal(presentation.happenedAt, null);
  assert.equal(presentation.happenedLabel, 'Unavailable');
  assert.equal(presentation.receivedAt, receivedAt);
  assert.equal(presentation.qualityLabel, 'Time unavailable');
  // Gray, not amber. A missing timestamp is missing information, which is what
  // gray means; it is not a request to go and check the sensor.
  assert.equal(presentation.qualityTone, 'gray');
  assert.equal(ACTIVITY_TABLE_HEADERS.includes('TIME'), false);
  assert.deepEqual(ACTIVITY_TABLE_HEADERS.slice(0, 2), [
    'WHEN IT HAPPENED',
    'WHEN RECEIVED',
  ]);
});

test('activity time wording stays plain and always shows when data arrived', () => {
  const presentation = getActivityTimePresentation({
    occurred_at: '2026-08-14T12:34:00Z',
    received_at: '2026-08-14T12:34:30Z',
    time_quality: 'ntp',
  });

  assert.equal(presentation.qualityLabel, 'Confirmed time');
  assert.notEqual(presentation.receivedLabel, 'Same upload window');
  assert.equal(presentation.receivedLabel, 'Aug 14, 20:34:30');
});

test('runtime summary separates candidates, relay activations, and unresolved time', () => {
  const now = Date.parse('2026-08-08T12:00:00Z');
  const events = [
    { event_kind: 'LIVE_ACCEPT', display_time: '2026-08-08T11:00:00Z', temporal_candidate: true, relay_energized: false, time_quality: 'boot_anchor' },
    { event_kind: 'RELAY_ON', display_time: '2026-08-08T10:00:00Z', temporal_candidate: false, relay_energized: true, time_quality: 'unresolved' },
    { event_kind: 'LIVE_ACCEPT', display_time: '2026-07-01T10:00:00Z', temporal_candidate: true, relay_energized: false, time_quality: 'boot_anchor' },
  ];
  assert.deepEqual(buildRuntimeSummary(events, now), {
    total: 3, last24h: 2, candidateCount: 2, relayCount: 1,
    unresolvedCount: 1, latestAt: '2026-08-08T11:00:00Z',
  });
});

test('runtime summary excludes diagnostic and redundant relay lifecycle rows', () => {
  const now = Date.parse('2026-08-09T12:00:00Z');
  const events = [
    { event_kind: 'BOOT', display_time: '2026-08-09T11:00:00Z' },
    { event_kind: 'TEST_ACCEPT', display_time: '2026-08-09T11:01:00Z' },
    { event_kind: 'LIVE_ACCEPT', display_time: '2026-08-09T11:02:00Z', temporal_candidate: true },
    { event_kind: 'RELAY_INTENT', display_time: '2026-08-09T11:03:00Z' },
    { event_kind: 'RELAY_ON', display_time: '2026-08-09T11:04:00Z', relay_energized: true },
    { event_kind: 'RELAY_OFF', display_time: '2026-08-09T11:05:00Z' },
    { event_kind: 'COOLDOWN_COMPLETE', display_time: '2026-08-09T11:06:00Z' },
    { event_kind: 'RELAY_REJECT', display_time: '2026-08-09T11:07:00Z' },
  ];

  assert.deepEqual(buildRuntimeSummary(events, now), {
    total: 4,
    last24h: 4,
    candidateCount: 1,
    relayCount: 1,
    unresolvedCount: 0,
    latestAt: '2026-08-09T11:07:00Z',
  });
});

test('candidate series fills chronological Asia/Manila buckets, including zeroes', () => {
  const now = Date.parse('2026-08-08T12:30:00Z');
  const rows = [
    { display_time: '2026-08-08T11:00:00Z' },
    { display_time: '2026-08-08T11:30:00Z' },
  ];
  const series = buildActivitySeries(rows, 'today', now);
  assert.equal(series.length, 24);
  assert.equal(series.reduce((sum, point) => sum + point.v, 0), 2);
  assert.ok(series.some(point => point.v === 0));
  assert.ok(series.every((point, index) => index === 0 || point.start > series[index - 1].start));
});

test('candidate score distribution preserves empty buckets and cautious labels', () => {
  assert.deepEqual(buildConfidenceDistribution([
    { candidate_score: 0.95 }, { candidate_score: 0.82 }, { candidate_score: 0.61 },
  ]), [
    { range: '0–59%', count: 0 },
    { range: '60–79%', count: 1 },
    { range: '80–89%', count: 1 },
    { range: '90–100%', count: 1 },
  ]);
  assert.equal(getEventPresentation('LIVE_ACCEPT').label, DETECTION_TERM.singular);
  assert.equal(getEventPresentation('UNKNOWN').color, 'gray');
});

/*
 * The label for a LIVE_ACCEPT row had drifted to "Likely Aedes Mosquito", which
 * claims more than a 16.67 percent grouped precision supports, and "candidate"
 * had leaked out of the database vocabulary into strings people read. Both are
 * easy to reintroduce by editing one map, so they are asserted rather than
 * merely commented.
 */
test('no event label claims a confirmation or leaks the word candidate', () => {
  const kinds = [
    'BOOT', 'TEST_ACCEPT', 'LIVE_ACCEPT', 'RELAY_INTENT', 'RELAY_ON',
    'RELAY_OFF', 'RELAY_REJECT', 'COOLDOWN_COMPLETE', 'UNKNOWN',
  ];
  const banned = ['candidate', 'likely', 'confirmed', 'detected mosquito'];

  kinds.forEach(kind => {
    const label = getEventPresentation(kind).label.toLowerCase();
    banned.forEach(word => {
      assert.ok(!label.includes(word), `${kind} label must not contain "${word}": ${label}`);
    });
  });
});

test('relay pairing uses device and source packet and derives evidence duration', () => {
  const episodes = deriveRelayEpisodes([
    { device_id: 'd1', source_boot: 7, source_sequence: 4, event_kind: 'RELAY_INTENT', occurred_at: '2026-08-08T10:00:00Z' },
    { device_id: 'd1', source_boot: 7, source_sequence: 4, event_kind: 'RELAY_ON', occurred_at: '2026-08-08T10:00:01Z' },
    { device_id: 'd1', source_boot: 7, source_sequence: 4, event_kind: 'RELAY_OFF', occurred_at: '2026-08-08T10:00:09Z' },
  ]);
  assert.equal(episodes.length, 1);
  assert.equal(episodes[0].relay_status, 'stopped');
  assert.equal(episodes[0].duration_seconds, 8);
  assert.equal(episodes[0].recorded_relay_activation, true);
});

test('cooldown completion without relay-on evidence is not a spraying episode', () => {
  const episodes = deriveRelayEpisodes([
    {
      device_id: 'd1',
      source_boot: 0,
      source_sequence: 0,
      event_kind: 'COOLDOWN_COMPLETE',
      occurred_at: '2026-08-12T05:12:17Z',
      reason: 'cleared',
    },
  ]);

  assert.deepEqual(episodes, []);
});
