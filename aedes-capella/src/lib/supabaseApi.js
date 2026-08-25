import {
  isSupabaseConfigured,
  supabaseAnonKey,
  supabaseUrl,
} from './supabaseClient';
import { isDisplayableRelayEpisode } from '../utils/dashboardData';

export { isSupabaseConfigured } from './supabaseClient';

function normalizeSession(payload) {
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
    user: { id: payload.user.id, email: payload.user.email },
  };
}

async function request(path, { accessToken, body, method = 'GET', signal } = {}) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured for this dashboard.');
  }

  const response = await fetch(`${supabaseUrl}${path}`, {
    method,
    signal,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken || supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.msg || payload?.message || payload?.error_description || payload?.error;
    throw new Error(message || `Supabase request failed (${response.status}).`);
  }

  return payload;
}

export async function signInWithPassword(email, password) {
  const payload = await request('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password },
  });

  return normalizeSession(payload);
}

export async function refreshOperatorSession(refreshToken) {
  const payload = await request('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: { refresh_token: refreshToken },
  });
  return normalizeSession(payload);
}

export async function signOut(accessToken) {
  await request('/auth/v1/logout', { method: 'POST', accessToken });
}

/*
 * The signed-in user's role, from the existing current_user_role() function.
 * Only 'admin' and 'technical_personnel' see engineering detail; health
 * officers and sanitary inspectors get the plain-language view.
 *
 * A failure here must not lock anyone out, so callers treat an error as the
 * least-privileged answer rather than surfacing it.
 */
export async function fetchCurrentUserRole(accessToken, signal) {
  const role = await request('/rest/v1/rpc/current_user_role', {
    method: 'POST',
    accessToken,
    body: {},
    signal,
  });
  return typeof role === 'string' ? role : null;
}

export async function fetchDeviceStatus(accessToken, signal) {
  const columns = [
    'device_id', 'device_label', 'last_seen_at', 'has_ever_reported',
    'heartbeat_state', 'operational_state', 'is_online', 'log_healthy',
    'relay_safe_high', 'wifi_rssi_dbm', 'uptime_ms', 'heartbeat_age_seconds',
    'expected_heartbeat_cadence_minutes', 'stale_after_minutes',
    'offline_after_minutes', 'latest_event_at', 'latest_event_received_at',
    'latest_upload_or_event_at', 'latest_event_time_quality', 'latest_event_kind',
    'latest_activity_at', 'needs_attention', 'mist_events_last_7d',
    'candidates_last_7d', 'free_heap_bytes', 'c3_boot', 'last_ordinal',
    // Added by migration 202608140001. This selects named columns, so these
    // must not be requested before that migration is applied: an unknown column
    // fails the whole request and blanks Device Status rather than degrading.
    'unsent_records', 'oldest_unsent_at', 'unsent_backlog_state',
    'backlog_stalled_after_minutes',
  ].join(',');

  return request(`/rest/v1/dashboard_device_status?select=${columns}&order=device_label.asc`, {
    accessToken,
    signal,
  });
}

export async function fetchRuntimeActivity(accessToken, signal) {
  const columns = [
    'runtime_event_id', 'device_id', 'device_label', 'location_id',
    'location_name', 'barangay_name', 'occurred_at', 'received_at',
    'display_time', 'time_quality',
    'event_kind', 'source_boot', 'source_sequence', 'bag_index',
    'p_aedes', 'p_other_mosquito', 'p_background_noise',
    'temporal_candidate', 'relay_energized', 'reason', 'c3_boot', 'ordinal',
    'ingest_path',
  ].join(',');

  const operatorKinds = 'BOOT,LIVE_ACCEPT,RELAY_ON,RELAY_REJECT';
  return request(`/rest/v1/dashboard_runtime_activity?select=${columns}&event_kind=in.(${operatorKinds})&order=display_time.desc&limit=100`, {
    accessToken,
    signal,
  });
}

export async function fetchActivitySummary(accessToken, signal) {
  const rows = await request('/rest/v1/rpc/dashboard_activity_summary', {
    method: 'POST',
    accessToken,
    body: { p_window_hours: 24 },
    signal,
  });
  return Array.isArray(rows) ? rows[0] || null : rows;
}

export async function fetchRuntimeActivityById(accessToken, runtimeEventId, signal) {
  const rows = await request(
    `/rest/v1/dashboard_runtime_activity?select=*&runtime_event_id=eq.${encodeURIComponent(runtimeEventId)}&limit=1`,
    { accessToken, signal },
  );
  return rows[0] || null;
}

export async function fetchCandidateActivity(accessToken, signal) {
  const columns = [
    'candidate_event_id', 'device_id', 'device_label', 'location_id',
    'location_name', 'barangay_name', 'occurred_at', 'received_at',
    'display_time', 'time_quality', 'source_boot', 'source_sequence',
    'bag_index', 'candidate_score', 'p_other_mosquito',
    'p_background_noise', 'c3_boot', 'ordinal', 'ingest_path',
  ].join(',');

  return request(`/rest/v1/dashboard_candidate_activity?select=${columns}&order=display_time.desc&limit=500`, {
    accessToken,
    signal,
  });
}

export async function fetchCandidateActivityById(accessToken, runtimeEventId, signal) {
  const rows = await request(
    `/rest/v1/dashboard_candidate_activity?select=*&candidate_event_id=eq.${encodeURIComponent(runtimeEventId)}&limit=1`,
    { accessToken, signal },
  );
  return rows[0] || null;
}

export async function fetchRelayActivity(accessToken, signal) {
  const rows = await request('/rest/v1/dashboard_relay_activity?select=*&order=display_time.desc&limit=500', {
    accessToken,
    signal,
  });
  return rows.filter(isDisplayableRelayEpisode);
}

export async function fetchRelayActivityForSource(
  accessToken,
  deviceId,
  sourceBoot,
  sourceSequence,
  signal,
) {
  const query = [
    `device_id=eq.${encodeURIComponent(deviceId)}`,
    `source_boot=eq.${encodeURIComponent(sourceBoot)}`,
    `source_sequence=eq.${encodeURIComponent(sourceSequence)}`,
  ].join('&');
  const rows = await request(`/rest/v1/dashboard_relay_activity?select=*&${query}&limit=1`, {
    accessToken,
    signal,
  });
  return rows.find(isDisplayableRelayEpisode) || null;
}

export async function fetchDeviceMap(accessToken, signal) {
  return request('/rest/v1/dashboard_device_map?select=*&order=device_label.asc', {
    accessToken,
    signal,
  });
}

export async function fetchDeviceRegistry(accessToken, signal) {
  return request('/rest/v1/dashboard_device_registry?select=*&order=device_label.asc', {
    accessToken,
    signal,
  });
}

export async function fetchDeviceRegistryById(accessToken, deviceId, signal) {
  const rows = await request(
    `/rest/v1/dashboard_device_registry?select=*&device_id=eq.${encodeURIComponent(deviceId)}&limit=1`,
    { accessToken, signal },
  );
  return rows[0] || null;
}

export async function fetchLocations(accessToken, signal) {
  return request('/rest/v1/locations?select=location_id,location_name,barangay_name,is_active&is_active=eq.true&order=barangay_name.asc,location_name.asc', {
    accessToken,
    signal,
  });
}

export async function registerDevice(accessToken, device, signal) {
  return request('/rest/v1/rpc/admin_register_device', {
    method: 'POST',
    accessToken,
    signal,
    body: device,
  });
}

export async function updateDevice(accessToken, device, signal) {
  return request('/rest/v1/rpc/technical_update_device', {
    method: 'POST',
    accessToken,
    signal,
    body: device,
  });
}

export async function decommissionDevice(accessToken, deviceId, confirmationLabel, signal) {
  return request('/rest/v1/rpc/admin_decommission_device', {
    method: 'POST',
    accessToken,
    signal,
    body: {
      p_device_id: deviceId,
      p_confirmation_label: confirmationLabel,
    },
  });
}

export async function rotateDeviceToken(accessToken, deviceLabel, tokenSha256, signal) {
  return request('/rest/v1/rpc/admin_rotate_device_ingest_token', {
    method: 'POST',
    accessToken,
    signal,
    body: {
      p_device_label: deviceLabel,
      p_token_sha256: tokenSha256,
    },
  });
}

export async function fetchDeviceStatusById(accessToken, deviceId, signal) {
  const rows = await request(
    `/rest/v1/dashboard_device_status?select=*&device_id=eq.${encodeURIComponent(deviceId)}&limit=1`,
    { accessToken, signal },
  );
  return rows[0] || null;
}

export async function fetchDeviceMapById(accessToken, deviceId, signal) {
  const rows = await request(
    `/rest/v1/dashboard_device_map?select=*&device_id=eq.${encodeURIComponent(deviceId)}&limit=1`,
    { accessToken, signal },
  );
  return rows[0] || null;
}

export async function fetchDeviceMapByLocation(accessToken, locationId, signal) {
  return request(
    `/rest/v1/dashboard_device_map?select=*&location_id=eq.${encodeURIComponent(locationId)}&order=device_label.asc`,
    {
    accessToken,
    signal,
    },
  );
}
