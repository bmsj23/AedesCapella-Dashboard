import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeviceComparison,
  countCoincidentCandidates,
} from './deviceComparison.js';

test('candidate agreement greedily pairs each event at most once', () => {
  const left = [{ time: 100_000 }, { time: 150_000 }, { time: 400_000 }];
  const right = [{ time: 120_000 }, { time: 410_000 }];
  assert.equal(countCoincidentCandidates(left, right, 60_000), 2);
});

test('two-device comparison uses the same clock window for both units', () => {
  const now = Date.parse('2026-08-25T12:00:00Z');
  const result = buildDeviceComparison({
    leftDeviceId: 'unit-1',
    rightDeviceId: 'unit-2',
    hours: 24,
    now,
    candidates: [
      { device_id: 'unit-1', display_time: '2026-08-25T11:00:00Z' },
      { device_id: 'unit-1', display_time: '2026-08-23T11:00:00Z' },
      { device_id: 'unit-2', display_time: '2026-08-25T11:00:40Z' },
    ],
    relays: [
      { device_id: 'unit-2', started_at: '2026-08-25T10:00:00Z' },
    ],
  });

  assert.deepEqual(result.devices.map(row => row.candidates), [1, 1]);
  assert.deepEqual(result.devices.map(row => row.candidatesPerHour), [1 / 24, 1 / 24]);
  assert.equal(result.devices[1].relayActivations, 1);
  assert.equal(result.matchedCandidates, 1);
  assert.equal(result.agreementPercent, 100);
});

test('agreement is unavailable when neither unit has a candidate', () => {
  const result = buildDeviceComparison({
    leftDeviceId: 'unit-1',
    rightDeviceId: 'unit-2',
    candidates: [],
    relays: [],
  });
  assert.equal(result.agreementPercent, null);
});
