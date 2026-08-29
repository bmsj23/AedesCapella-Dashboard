const DEVICE_LABEL_PATTERN = /^[a-z0-9][a-z0-9-]{2,62}$/;

function nullableNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NaN;
}

function rangeError(value, minimum, maximum, label) {
  if (value === null) return '';
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    return `${label} must be between ${minimum} and ${maximum}.`;
  }
  return '';
}

export function validateDeviceDraft(draft, { requireToken = false } = {}) {
  const label = String(draft.deviceLabel || '').trim().toLowerCase();
  const firmware = String(draft.firmwareVersion || '').trim();
  const notes = String(draft.placementNotes || '').trim();
  const distance = nullableNumber(draft.placementDistanceM);
  const height = nullableNumber(draft.placementHeightM);
  const angle = nullableNumber(draft.placementAngleDegrees);

  if (!DEVICE_LABEL_PATTERN.test(label)) {
    return 'Device label must use 3 to 63 lowercase letters, numbers, or hyphens.';
  }
  if (!draft.locationId) return 'Choose an active deployment location.';
  if (firmware.length > 120) return 'Firmware version must be 120 characters or fewer.';
  if (notes.length > 500) return 'Placement notes must be 500 characters or fewer.';
  if (requireToken && String(draft.ingestToken || '').length < 32) {
    return 'Generate an ingest token before registering the device.';
  }

  return rangeError(distance, 0, 100, 'Distance')
    || rangeError(height, 0, 10, 'Height')
    || rangeError(angle, -180, 180, 'Angle');
}

export function deviceDraftToRpc(draft, { includeToken = false, deviceId } = {}) {
  const payload = {
    p_device_label: String(draft.deviceLabel || '').trim().toLowerCase(),
    p_location_id: draft.locationId,
    p_firmware_version: String(draft.firmwareVersion || '').trim() || null,
    p_placement_distance_m: nullableNumber(draft.placementDistanceM),
    p_placement_height_m: nullableNumber(draft.placementHeightM),
    p_placement_angle_degrees: nullableNumber(draft.placementAngleDegrees),
    p_placement_notes: String(draft.placementNotes || '').trim() || null,
  };
  if (includeToken) payload.p_ingest_token = draft.ingestToken;
  if (deviceId) payload.p_device_id = deviceId;
  return payload;
}

export function registryRowToDraft(row) {
  return {
    deviceLabel: row.device_label || '',
    locationId: row.location_id || '',
    firmwareVersion: row.firmware_version || '',
    placementDistanceM: row.placement_distance_m ?? '',
    placementHeightM: row.placement_height_m ?? '',
    placementAngleDegrees: row.placement_angle_degrees ?? '',
    placementNotes: row.placement_notes || '',
    ingestToken: '',
  };
}

export function emptyDeviceDraft(locationId = '') {
  return {
    deviceLabel: '',
    locationId,
    firmwareVersion: '',
    placementDistanceM: '',
    placementHeightM: '',
    placementAngleDegrees: '',
    placementNotes: '',
    ingestToken: '',
  };
}

export function generateDeviceToken(cryptoApi = globalThis.crypto) {
  if (!cryptoApi?.getRandomValues) throw new Error('Secure random generation is unavailable.');
  const bytes = cryptoApi.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(value, cryptoApi = globalThis.crypto) {
  if (!cryptoApi?.subtle) throw new Error('Secure hashing is unavailable.');
  const bytes = new TextEncoder().encode(value);
  const digest = await cryptoApi.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
