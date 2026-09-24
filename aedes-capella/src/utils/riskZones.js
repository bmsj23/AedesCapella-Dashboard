/*
 * Risk zones on the Barangay Map.
 *
 * A zone is a circle around a device that recorded possible Aedes detections
 * (LIVE_ACCEPT, window summaries excluded) in the last seven days. It tells a
 * health worker where to look for breeding sites; it is not a confirmed
 * mosquito count, which is why the legend carries DETECTION_TERM.caveat.
 *
 * The radius is Aedes aegypti's usual flight range: most adults stay within
 * a few hundred metres of where they emerged, so 200 m around the device is
 * the area worth searching, not a claim about where every mosquito is.
 *
 * Two levels, on the dashboard's existing severity scale rather than a new
 * one: amber is "check soon", red is "needs action".
 */

import { DETECTION_TERM } from '../constants/terminology.js';

export const RISK_ZONE_RADIUS_M = 200;
export const RISK_WINDOW_DAYS = 7;

export const RISK_LEVELS = Object.freeze([
  Object.freeze({
    key: 'high',
    minDetections: 5,
    label: 'High risk',
    action: 'Search and clean breeding sites nearby',
    color: '#dc2626',
  }),
  Object.freeze({
    key: 'watch',
    minDetections: 1,
    label: 'Watch',
    action: 'Check for standing water soon',
    color: '#e07b13',
  }),
]);

export function riskLevelFor(count) {
  const detections = Number(count) || 0;
  return RISK_LEVELS.find(level => detections >= level.minDetections) || null;
}

/*
 * dashboard_device_map carries its own seven-day count once migration
 * 202609240001 is applied. Until then the Device Status row's count stands in,
 * so zones appear either way.
 */
export function detectionsLastWeek(mapDevice, statusDevice) {
  const count = mapDevice?.candidates_last_7d ?? statusDevice?.candidates_last_7d ?? 0;
  return Number(count) || 0;
}

export function buildRiskZones(mappedDevices, statusDevices = []) {
  const statusById = new Map(statusDevices.map(device => [device.device_id, device]));

  return mappedDevices.flatMap(device => {
    const detections = detectionsLastWeek(device, statusById.get(device.device_id));
    const level = riskLevelFor(detections);
    if (!level) return [];

    return [{
      deviceId: device.device_id,
      deviceLabel: device.device_label,
      latitude: Number(device.latitude),
      longitude: Number(device.longitude),
      detections,
      level,
    }];
  });
}

const EARTH_RADIUS_M = 6_371_008.8;

/*
 * A closed GeoJSON ring approximating a circle of radiusM metres. MapLibre has
 * no metre-sized circle primitive (circle-radius is in screen pixels), so the
 * zone is drawn as a polygon that stays the right size at every zoom.
 */
export function circleRing(latitude, longitude, radiusM, steps = 64) {
  const lat = (latitude * Math.PI) / 180;
  const lon = (longitude * Math.PI) / 180;
  const angular = radiusM / EARTH_RADIUS_M;
  const ring = [];

  for (let step = 0; step < steps; step += 1) {
    const bearing = (2 * Math.PI * step) / steps;
    const pointLat = Math.asin(
      Math.sin(lat) * Math.cos(angular) + Math.cos(lat) * Math.sin(angular) * Math.cos(bearing),
    );
    const pointLon = lon + Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat),
      Math.cos(angular) - Math.sin(lat) * Math.sin(pointLat),
    );
    ring.push([(pointLon * 180) / Math.PI, (pointLat * 180) / Math.PI]);
  }

  ring.push(ring[0]);
  return ring;
}

export function riskZonesGeoJson(zones, radiusM = RISK_ZONE_RADIUS_M) {
  return {
    type: 'FeatureCollection',
    features: zones.map(zone => ({
      type: 'Feature',
      properties: { deviceId: zone.deviceId, level: zone.level.key, color: zone.level.color },
      geometry: { type: 'Polygon', coordinates: [circleRing(zone.latitude, zone.longitude, radiusM)] },
    })),
  };
}

export function describeDeviceRisk(detections) {
  const level = riskLevelFor(detections);
  const days = `${RISK_WINDOW_DAYS} days`;
  if (!level) return `No risk zone: nothing recorded in the last ${days}`;
  return `${level.label}: ${detections} ${detections === 1 ? DETECTION_TERM.inlineSingular : DETECTION_TERM.inlinePlural} in the last ${days}`;
}
