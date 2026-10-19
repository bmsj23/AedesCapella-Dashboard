import test from 'node:test';
import assert from 'node:assert/strict';
import { attentionDevices, sprayReason } from './activityGuidance.js';
test('attention uses seven-day totals, includes unmapped devices and sorts high before watch', () => {
  const devices = [
    { device_id: 'watch', candidates_last_7d: 1 },
    { device_id: 'quiet', candidates_last_7d: 0 },
    { device_id: 'high', candidates_last_7d: 5 },
  ];
  const rows = attentionDevices(devices, [], [{ device_id: 'high', occurred_at: '2026-10-19T01:00:00Z' }]);
  assert.deepEqual(rows.map(row => row.device_id), ['high', 'watch']);
  assert.equal(rows[0].latestDetection.occurred_at, '2026-10-19T01:00:00Z');
  assert.equal(rows[1].latestDetection, null);
  assert.deepEqual(attentionDevices(), []);
});
test('spray explanations never invent the five sound checks', () => {
  assert.match(sprayReason({ recorded_relay_activation: true }), /does not include/);
  assert.match(sprayReason({ event_kind: 'RELAY_REJECT' }), /did not start/);
  assert.match(sprayReason({ relay_status: 'requested' }), /not confirmed/);
});

import { actionForEvent, matchText } from './activityGuidance.js';
import { candidateScorePercent, matchStrengthLabel } from './dashboardData.js';
test('missing scores stay unknown and existing score boundaries are retained', () => {
  for (const value of [null, undefined, '', 'bad', -0.1, 1.1]) assert.equal(candidateScorePercent({ candidate_score: value }), null);
  assert.equal(candidateScorePercent({ candidate_score: 0 }), 0);
  assert.equal(matchStrengthLabel(59.9), 'Weak match');
  assert.equal(matchStrengthLabel(60), 'Possible match');
  assert.equal(matchStrengthLabel(80), 'Strong match');
  assert.equal(matchStrengthLabel(90), 'Very strong match');
  assert.equal(matchStrengthLabel(100), 'Very strong match');
  assert.equal(matchStrengthLabel(100.1), 'Not available');
  assert.equal(matchText(85), 'Strong match');
  assert.match(matchText(85, true), /85.0%.*Strong match/);
});
test('attention and row actions use map totals with status fallback and latest loaded timestamp', () => {
  const status = [{ device_id: 'd', candidates_last_7d: 5 }];
  const map = [{ device_id: 'd' }];
  const rows = attentionDevices(status, map, [
    { device_id: 'd', display_time: '2026-10-18T01:00:00Z' },
    { device_id: 'd', display_time: '2026-10-19T01:00:00Z', time_quality: 'unresolved' },
  ]);
  assert.equal(rows[0].level.key, 'high');
  assert.equal(rows[0].latestDetection.time_quality, 'unresolved');
  assert.equal(actionForEvent({ device_id: 'd', temporal_candidate: true }, status, map), rows[0].level.action);
  assert.equal(attentionDevices(status, [{ device_id: 'd', candidates_last_7d: 0 }]).length, 0);
  assert.equal(actionForEvent({ device_id: 'd', temporal_candidate: true, reason: 'cooldown_observation' }, status, map), null);
});
