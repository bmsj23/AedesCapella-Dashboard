import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRiskZones,
  circleRing,
  describeDeviceRisk,
  riskLevelFor,
  riskZonesGeoJson,
  RISK_ZONE_RADIUS_M,
} from './riskZones.js';

const unit = (id, overrides = {}) => ({
  device_id: id,
  device_label: `aedescapella-unit-${id}`,
  latitude: 13.949778,
  longitude: 121.173167,
  ...overrides,
});

test('no detections draws no zone; one is watch; five is high', () => {
  assert.equal(riskLevelFor(0), null);
  assert.equal(riskLevelFor(null), null);
  assert.equal(riskLevelFor(1).key, 'watch');
  assert.equal(riskLevelFor(4).key, 'watch');
  assert.equal(riskLevelFor(5).key, 'high');
});

test('zones use the map count, and fall back to the device status count', () => {
  const zones = buildRiskZones(
    [unit(1, { candidates_last_7d: 6 }), unit(2), unit(3)],
    [{ device_id: 2, candidates_last_7d: 2 }, { device_id: 3, candidates_last_7d: 0 }],
  );
  assert.deepEqual(zones.map(zone => [zone.deviceId, zone.detections, zone.level.key]), [
    [1, 6, 'high'],
    [2, 2, 'watch'],
  ]);
});

test('the zone ring is closed and sits the radius away from the device', () => {
  const ring = circleRing(13.949778, 121.173167, RISK_ZONE_RADIUS_M);
  assert.deepEqual(ring[0], ring.at(-1));

  const [lon, lat] = ring[0];
  const northMetres = (lat - 13.949778) * 111_195;
  assert.ok(Math.abs(northMetres - RISK_ZONE_RADIUS_M) < 1, `${northMetres} m`);
  assert.ok(Math.abs(lon - 121.173167) < 1e-9);
});

test('zones become one GeoJSON polygon each, carrying their colour', () => {
  const collection = riskZonesGeoJson(buildRiskZones([unit(1, { candidates_last_7d: 1 })]));
  assert.equal(collection.features.length, 1);
  assert.equal(collection.features[0].geometry.type, 'Polygon');
  assert.equal(collection.features[0].properties.level, 'watch');
});

test('the popup line says what the zone means in plain words', () => {
  assert.equal(describeDeviceRisk(0), 'No risk zone: nothing recorded in the last 7 days');
  assert.equal(describeDeviceRisk(7), 'High risk: 7 possible Aedes detections in the last 7 days');
});
