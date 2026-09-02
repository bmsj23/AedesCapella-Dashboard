import test from 'node:test';
import assert from 'node:assert/strict';
import {
  connectionStateForChannelStatus,
  EMPTY_LIVE_DASHBOARD,
  filterMappedDevices,
  filterUnmappedDevices,
  liveDashboardReducer,
} from './liveDashboard.js';

test('initial authenticated hydration installs every shared dataset', () => {
  const next = liveDashboardReducer(EMPTY_LIVE_DASHBOARD, {
    type: 'reconcile',
    datasets: {
      activity: [{ runtime_event_id: 1 }],
      activitySummary: { candidates_all_time: 22 },
      candidates: [], relays: [], devices: [], mapDevices: [], deviceRegistry: [],
    },
    errors: {}, complete: true, at: new Date('2026-08-09T00:00:00Z'),
  });
  assert.equal(next.loading, false);
  assert.equal(next.activity.length, 1);
  assert.equal(next.activitySummary.candidates_all_time, 22);
  assert.equal(next.reconciledAt.toISOString(), '2026-08-09T00:00:00.000Z');
});

test('Realtime summary refresh replaces stale aggregate totals', () => {
  const start = {
    ...EMPTY_LIVE_DASHBOARD,
    activitySummary: { candidates_all_time: 21, relay_activations_all_time: 37 },
  };
  const next = liveDashboardReducer(start, {
    type: 'set_activity_summary',
    row: { candidates_all_time: 22, relay_activations_all_time: 38 },
  });
  assert.equal(next.activitySummary.candidates_all_time, 22);
  assert.equal(next.activitySummary.relay_activations_all_time, 38);
});

test('Realtime candidate insert is highlighted and duplicate delivery is deduplicated', () => {
  const row = { runtime_event_id: 44, display_time: '2026-08-09T01:00:00Z', temporal_candidate: true };
  const once = liveDashboardReducer(EMPTY_LIVE_DASHBOARD, { type: 'upsert_activity', row, live: true, at: 123 });
  const twice = liveDashboardReducer(once, { type: 'upsert_activity', row, live: true, at: 124 });
  assert.equal(twice.activity.length, 1);
  assert.equal(twice.activity[0].live_arrival_at, 124);
});

test('a stale reconciliation response cannot erase a newer Realtime activity row', () => {
  const liveRow = {
    runtime_event_id: 45,
    display_time: '2026-08-09T01:01:00Z',
    event_kind: 'LIVE_ACCEPT',
  };
  const olderRow = {
    runtime_event_id: 44,
    display_time: '2026-08-09T01:00:00Z',
    event_kind: 'BOOT',
  };
  const withLiveRow = liveDashboardReducer(EMPTY_LIVE_DASHBOARD, {
    type: 'upsert_activity', row: liveRow, live: true, at: 123,
  });
  const reconciled = liveDashboardReducer(withLiveRow, {
    type: 'reconcile',
    datasets: { activity: [olderRow] },
    errors: {}, complete: true, at: new Date('2026-08-09T01:01:01Z'),
  });

  assert.deepEqual(
    reconciled.activity.map(row => row.runtime_event_id),
    [45, 44],
  );
});

test('heartbeat update replaces the correct device and preserves logging-fault precedence', () => {
  const start = { ...EMPTY_LIVE_DASHBOARD, devices: [{ device_id: 'd1', operational_state: 'online' }] };
  const next = liveDashboardReducer(start, {
    type: 'upsert_device', row: { device_id: 'd1', operational_state: 'logging_fault', log_healthy: false },
  });
  assert.equal(next.devices.length, 1);
  assert.equal(next.devices[0].operational_state, 'logging_fault');
  assert.equal(next.devices[0].log_healthy, false);
});

test('socket loss is visible and a later polling reconciliation recovers datasets', () => {
  const disconnected = liveDashboardReducer(EMPTY_LIVE_DASHBOARD, { type: 'connection', value: 'polling_fallback' });
  const reconciled = liveDashboardReducer(disconnected, {
    type: 'reconcile', datasets: { activity: [{ runtime_event_id: 9 }] }, errors: {}, complete: true, at: new Date(),
  });
  assert.equal(disconnected.connectionState, 'polling_fallback');
  assert.equal(reconciled.activity[0].runtime_event_id, 9);
  assert.equal(connectionStateForChannelStatus('SUBSCRIBED', true), 'live');
  assert.equal(connectionStateForChannelStatus('CHANNEL_ERROR', true), 'polling_fallback');
});

test('invalid and null coordinates remain explicitly unmapped', () => {
  const devices = [
    { device_id: 'mapped', latitude: 13.94, longitude: 121.16 },
    { device_id: 'null', latitude: null, longitude: null },
    { device_id: 'invalid', latitude: 200, longitude: 121 },
  ];
  assert.deepEqual(filterMappedDevices(devices).map(row => row.device_id), ['mapped']);
  assert.deepEqual(filterUnmappedDevices(devices).map(row => row.device_id), ['null', 'invalid']);
});

test('a failed reconciliation keeps the device rows already on screen', () => {
  // The section renders the previous rows under an error banner rather than
  // blanking. That is only possible if the reducer does not drop them.
  const loaded = liveDashboardReducer(EMPTY_LIVE_DASHBOARD, {
    type: 'reconcile',
    datasets: { devices: [{ device_id: 'd1', operational_state: 'online' }] },
    errors: {}, complete: true, at: new Date('2026-08-14T10:00:00Z'),
  });
  const failed = liveDashboardReducer(loaded, {
    type: 'reconcile',
    datasets: {},
    errors: { devices: 'The dashboard cannot reach the service right now.' },
    complete: false, at: new Date('2026-08-14T10:00:30Z'),
  });

  assert.equal(failed.devices.length, 1);
  assert.equal(failed.devices[0].device_id, 'd1');
  assert.ok(failed.errors.devices);
  // "Last checked" must keep pointing at the last good read, not the failure.
  assert.equal(failed.reconciledAt.toISOString(), '2026-08-14T10:00:00.000Z');
});

test('refreshing is separate from first-load loading, and always clears', () => {
  const started = liveDashboardReducer(
    { ...EMPTY_LIVE_DASHBOARD, loading: false },
    { type: 'refresh_start' },
  );
  assert.equal(started.refreshing, true);
  assert.equal(started.loading, false, 'a refresh must not re-enter the blocking first-load state');

  assert.equal(liveDashboardReducer(started, { type: 'refresh_end' }).refreshing, false);
});

test('a click event is not an AbortSignal, which is what broke Refresh', () => {
  // onClick={refresh} handed reconcile a React SyntheticEvent, which it passed
  // to fetch as `signal`. fetch threw "Failed to execute 'fetch' on 'Window'",
  // every source failed at once, and the word "fetch" in that message made
  // getFriendlyError report a healthy dashboard as having lost its connection.
  const clickEvent = { type: 'click', target: {}, nativeEvent: {} };
  assert.equal(clickEvent instanceof AbortSignal, false);
  assert.equal(new AbortController().signal instanceof AbortSignal, true);
});
