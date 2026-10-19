import test from 'node:test';
import assert from 'node:assert/strict';
import { activityWindow, manilaDate } from './activityWindow.js';
import { buildRuntimeSummary } from './dashboardData.js';

const cutoff = Date.parse('2026-09-29T00:00:00+08:00');
const now = Date.parse('2026-10-20T06:00:00Z');

test('Manila calendar date turns over at 16:00 UTC', () => {
  assert.equal(manilaDate(Date.parse('2026-09-29T15:59:59Z')), '2026-09-29');
  assert.equal(manilaDate(Date.parse('2026-09-29T16:00:00Z')), '2026-09-30');
  const day = activityWindow('day', '2026-09-30', cutoff, now);
  assert.equal(day.startIso, '2026-09-29T16:00:00.000Z');
  assert.equal(day.endIso, '2026-09-30T16:00:00.000Z');
  assert.equal(day.label, 'Wed 30 Sep 2026');
});

test('week spans two months, Monday through Sunday with an exclusive end', () => {
  const week = activityWindow('week', '2026-09-29', -Infinity, now);
  assert.equal(week.startIso, '2026-09-27T16:00:00.000Z');
  assert.equal(week.endIso, '2026-10-04T16:00:00.000Z');
  assert.equal(week.label, 'Mon 28 Sep to Sun 4 Oct 2026');
  assert.deepEqual(activityWindow('week', '2026-10-04', -Infinity, now), week);
});

test('dates before the cutoff, future dates, and invalid calendar dates are blocked', () => {
  for (const date of ['2026-09-28', '2026-10-21', '2026-09-31', '', 'garbage']) {
    assert.equal(activityWindow('day', date, cutoff, now), null);
  }
  assert.equal(activityWindow('week', '2026-09-28', cutoff, now), null);
  assert.ok(activityWindow('day', '2026-09-29', cutoff, now));
});

test('first week keeps the calendar label but clips its query to the cutoff', () => {
  const week = activityWindow('week', '2026-09-29', cutoff, now);
  assert.equal(week.startIso, '2026-09-28T16:00:00.000Z');
  assert.equal(week.endIso, '2026-10-04T16:00:00.000Z');
  assert.equal(week.cutoffApplied, true);
  assert.equal(week.label, 'Mon 28 Sep to Sun 4 Oct 2026');
  const midday = Date.parse('2026-09-29T05:00:00Z');
  assert.equal(activityWindow('day', '2026-09-29', midday, now).startIso, new Date(midday).toISOString());
});

test('historical counts follow candidate, relay, and unresolved rules without rolling-window counts', () => {
  const summary = buildRuntimeSummary([
    { event_kind: 'LIVE_ACCEPT', temporal_candidate: true },
    { event_kind: 'LIVE_ACCEPT', temporal_candidate: true, reason: 'cooldown_observatio' },
    { event_kind: 'RELAY_ON', relay_energized: true },
    { event_kind: 'BOOT', time_quality: 'unresolved', display_time: '2026-09-30T05:30:00Z' },
    { event_kind: 'TEST_ACCEPT', temporal_candidate: true, relay_energized: true },
  ], now);
  assert.equal(summary.candidateCount, 1);
  assert.equal(summary.relayCount, 1);
  assert.equal(summary.unresolvedCount, 1);
  assert.equal(summary.latestAt, '2026-09-30T05:30:00Z');
});
