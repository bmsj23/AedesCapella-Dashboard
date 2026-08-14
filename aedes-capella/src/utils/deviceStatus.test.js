import test from 'node:test';
import assert from 'node:assert/strict';
import {
  describeDeviceState,
  describeUploadBacklog,
  formatDuration,
  formatTimestamp,
  getStatusPresentation,
} from './deviceStatus.js';

test('maps every declared sensor state to a plain-language label', () => {
  assert.equal(getStatusPresentation('online').label, 'Working');
  assert.equal(getStatusPresentation('stale').label, 'Check soon');
  assert.equal(getStatusPresentation('offline').label, 'Offline');
  assert.equal(getStatusPresentation('never_seen').label, 'Not connected yet');
  assert.equal(getStatusPresentation('logging_fault').label, 'Records may be missing');
});

test('never-seen and logging-fault messages are explicit', () => {
  assert.match(describeDeviceState({ operational_state: 'never_seen' }), /never sent an update/i);
  assert.match(describeDeviceState({ operational_state: 'logging_fault' }), /records may not be saved/i);
});

test('duration and null timestamps are safe', () => {
  assert.equal(formatDuration(null), '—');
  assert.equal(formatDuration(90_000_000), '1d 1h 0m');
  assert.equal(formatTimestamp(null), 'Never');
});

const NOW = Date.parse('2026-08-14T10:00:00Z');

test('a fully uploaded sensor says so, without a nag', () => {
  const backlog = describeUploadBacklog(
    { unsent_backlog_state: 'clear', unsent_records: 0, oldest_unsent_at: null },
    NOW,
  );
  assert.equal(backlog.label, 'All records sent');
  assert.equal(backlog.color, 'green');
  assert.equal(backlog.detail, null);
});

test('a backlog reports its depth and how long the silence has lasted', () => {
  const backlog = describeUploadBacklog(
    {
      unsent_backlog_state: 'pending',
      unsent_records: 7,
      oldest_unsent_at: '2026-08-14T09:35:00Z',
    },
    NOW,
  );
  assert.equal(backlog.label, '7 waiting to send');
  assert.equal(backlog.detail, 'Nothing received for 0h 25m');
  assert.equal(backlog.color, 'blue');
});

test('only the database-decided stall turns the backlog amber', () => {
  const row = {
    unsent_records: 40,
    oldest_unsent_at: '2026-08-14T06:00:00Z',
  };
  assert.equal(describeUploadBacklog({ ...row, unsent_backlog_state: 'pending' }, NOW).color, 'blue');
  assert.equal(describeUploadBacklog({ ...row, unsent_backlog_state: 'stalled' }, NOW).color, 'amber');
});

test('a sensor that has never reported is not reported as zero', () => {
  const backlog = describeUploadBacklog(
    { unsent_backlog_state: 'unknown', unsent_records: null, oldest_unsent_at: null },
    NOW,
  );
  assert.equal(backlog.label, 'Not reported yet');
  assert.equal(backlog.color, 'gray');
});

test('a row from before the backlog columns existed degrades to "not reported"', () => {
  // fetchDeviceStatusById selects *, but a cached or older payload may not
  // carry the new columns. Undefined must read as no information, not as zero.
  assert.equal(describeUploadBacklog({}, NOW).label, 'Not reported yet');
});

test('a stalled backlog contradicts the "sending normally" reading, so it replaces it', () => {
  const online = {
    operational_state: 'online',
    expected_heartbeat_cadence_minutes: 30,
  };
  assert.match(describeDeviceState(online), /sending updates normally/i);
  assert.match(
    describeDeviceState({ ...online, unsent_backlog_state: 'stalled', unsent_records: 40 }),
    /40 of its saved records have not reached the dashboard/i,
  );
});

test('a sensor that stopped reporting disclaims the readings it still shows', () => {
  const offline = describeDeviceState({
    operational_state: 'offline', offline_after_minutes: 10,
  });
  assert.match(offline, /10-minute offline period/);
  assert.match(offline, /from the last update/i);

  const stale = describeDeviceState({
    operational_state: 'stale', stale_after_minutes: 6,
  });
  assert.match(stale, /6-minute check period/);
  assert.match(stale, /not from now/i);
});

test('a working sensor makes no such disclaimer', () => {
  const online = describeDeviceState({
    operational_state: 'online', expected_heartbeat_cadence_minutes: 2,
  });
  assert.match(online, /about every 2 minutes/);
  assert.doesNotMatch(online, /last update/i);
});
