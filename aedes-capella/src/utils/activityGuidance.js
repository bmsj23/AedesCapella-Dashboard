import { riskLevelFor } from './riskZones.js';
import { isDetectionCandidate, matchStrengthLabel } from './dashboardData.js';

export function attentionDevices(devices = [], mapDevices = [], candidates = []) {
  const byId = new Map(devices.map(device => [device.device_id, device]));
  for (const device of mapDevices) byId.set(device.device_id, { ...byId.get(device.device_id), ...device, candidates_last_7d: device.candidates_last_7d ?? byId.get(device.device_id)?.candidates_last_7d });
  return [...byId.values()].flatMap(device => {
    const level = riskLevelFor(device.candidates_last_7d);
    if (!level) return [];
    const latest = candidates.filter(row => row.device_id === device.device_id)
      .sort((a, b) => (Date.parse(b.display_time || b.occurred_at) || 0) - (Date.parse(a.display_time || a.occurred_at) || 0))[0];
    return [{ ...device, level, latestDetection: latest || null }];
  }).sort((a, b) => b.level.minDetections - a.level.minDetections
    || String(a.device_label).localeCompare(String(b.device_label)));
}

export function actionForEvent(event, devices = [], mapDevices = []) {
  if (!isDetectionCandidate(event)) return null;
  const mapped = mapDevices.find(row => row.device_id === event.device_id);
  const status = devices.find(row => row.device_id === event.device_id);
  return riskLevelFor(mapped?.candidates_last_7d ?? status?.candidates_last_7d)?.action || 'Check for standing water soon';
}

export function sprayReason(record) {
  if (record.rejected_at || record.relay_status === 'rejected' || record.event_kind === 'RELAY_REJECT') {
    return 'Spray did not start. ' + (['cooldown', 'cooldown_active'].includes(record.rejection_reason || record.reason)
      ? 'The device was waiting before it could spray again.' : 'The saved record does not give a confirmed reason.');
  }
  if (record.recorded_relay_activation || record.started_at || record.event_kind === 'RELAY_ON') {
    return 'The sprayer output was switched on. The saved record does not include all five sound checks, so the exact trigger cannot be confirmed here.';
  }
  return 'A spray request was recorded. A completed activation is not confirmed by this record.';
}

export function matchText(percent, technical = false) {
  const label = matchStrengthLabel(percent);
  return technical && label !== 'Not available' ? percent.toFixed(1) + '% (' + label + ')' : label;
}
