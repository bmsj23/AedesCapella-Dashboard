import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deviceDraftToRpc,
  generateDeviceToken,
  registryRowToDraft,
  sha256Hex,
  validateDeviceDraft,
} from './deviceManagement.js';

const validDraft = {
  deviceLabel: 'unit-2',
  locationId: '11111111-1111-1111-1111-111111111111',
  firmwareVersion: 'c3-69adac063',
  placementDistanceM: '2.5',
  placementHeightM: '1.2',
  placementAngleDegrees: '-30',
  placementNotes: 'Facing the shaded approach.',
  ingestToken: 'a'.repeat(64),
};

test('device draft validation enforces canonical identity and placement bounds', () => {
  assert.equal(validateDeviceDraft(validDraft, { requireToken: true }), '');
  assert.match(
    validateDeviceDraft({ ...validDraft, deviceLabel: 'Unit 2' }),
    /lowercase letters/,
  );
  assert.match(
    validateDeviceDraft({ ...validDraft, placementAngleDegrees: 181 }),
    /between -180 and 180/,
  );
});

test('device draft maps to named RPC parameters without empty strings', () => {
  assert.deepEqual(deviceDraftToRpc({
    ...validDraft,
    firmwareVersion: '',
    placementNotes: '',
  }, { includeToken: true }), {
    p_device_label: 'unit-2',
    p_location_id: validDraft.locationId,
    p_firmware_version: null,
    p_placement_distance_m: 2.5,
    p_placement_height_m: 1.2,
    p_placement_angle_degrees: -30,
    p_placement_notes: null,
    p_ingest_token: validDraft.ingestToken,
  });
});

test('registry rows round-trip placement fields into an edit draft', () => {
  assert.equal(registryRowToDraft({
    device_label: 'unit-2',
    location_id: validDraft.locationId,
    placement_distance_m: 0,
    placement_height_m: 1.2,
  }).placementDistanceM, 0);
});

test('generated ingest token has 256 bits and hashes deterministically', async () => {
  const token = generateDeviceToken();
  assert.match(token, /^[0-9a-f]{64}$/);
  assert.equal(
    await sha256Hex('aedescapella'),
    'a1decc9fa4f9dc35733fb86cc846799886ef81baec054b2749b96d01423f3df1',
  );
});
