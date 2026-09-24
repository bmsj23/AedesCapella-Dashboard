const MAX_ACTIVITY_ROWS = 500;

export const EMPTY_LIVE_DASHBOARD = {
  activity: [],
  activitySummary: null,
  candidates: [],
  relays: [],
  devices: [],
  deviceRegistry: [],
  mapDevices: [],
  errors: {},
  loading: true,
  // `loading` is the first load, when there is nothing on screen yet and a
  // section may legitimately show a placeholder instead of data. `refreshing`
  // is a re-fetch over data the reader can already see, so it may only drive a
  // button label -- never blank a section that is already populated.
  refreshing: false,
  reconciledAt: null,
  connectionState: 'reconnecting',
};

function rowTime(row) {
  return new Date(row?.display_time || row?.latest_activity_at || 0).getTime() || 0;
}

export function upsertByKey(current, incoming, key, limit = MAX_ACTIVITY_ROWS) {
  const rows = Array.isArray(incoming) ? incoming : [incoming];
  const byKey = new Map(current.map(row => [String(row[key]), row]));

  rows.filter(Boolean).forEach(row => {
    const rowKey = String(row[key]);
    byKey.set(rowKey, { ...byKey.get(rowKey), ...row });
  });

  return Array.from(byKey.values())
    .sort((a, b) => rowTime(b) - rowTime(a))
    .slice(0, limit);
}

/*
 * Devices are always listed by their number, whatever reported last.
 *
 * Device rows went through upsertByKey, which sorts by latest activity so the
 * activity feed reads newest first. That is right for events and wrong for
 * devices: every heartbeat or detection moved its device to the front, so
 * Device 2 swapped places with Device 1 until the next 30-second reconcile put
 * the server's order back.
 *
 * Sorted by the number a reader sees ("Device 2"), not the raw label: labels
 * in production are 'aedescapella-unit-1' and 'unit-2', so text order would
 * put a future 'aedescapella-unit-3' ahead of Device 2. Device 10 follows
 * Device 9. Labels without a number go last, in text order.
 */
function deviceNumber(device) {
  const match = String(device?.device_label ?? '').match(/(\d+)\s*$/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

export function compareDeviceLabels(a, b) {
  return (deviceNumber(a) - deviceNumber(b) || 0)
    || String(a?.device_label ?? '').localeCompare(String(b?.device_label ?? ''), 'en', { numeric: true })
    || String(a?.device_id ?? '').localeCompare(String(b?.device_id ?? ''));
}

function upsertDevices(current, incoming) {
  return upsertByKey(current, incoming, 'device_id', Number.POSITIVE_INFINITY).sort(compareDeviceLabels);
}

function sortedDevices(rows) {
  return Array.isArray(rows) ? [...rows].sort(compareDeviceLabels) : rows;
}

export function filterMappedDevices(devices) {
  return devices.filter(device => {
    if (device.latitude === null || device.latitude === undefined || device.latitude === ''
      || device.longitude === null || device.longitude === undefined || device.longitude === '') {
      return false;
    }
    const latitude = Number(device.latitude);
    const longitude = Number(device.longitude);
    return Number.isFinite(latitude)
      && Number.isFinite(longitude)
      && latitude >= -90
      && latitude <= 90
      && longitude >= -180
      && longitude <= 180;
  });
}

export function filterUnmappedDevices(devices) {
  const mappedIds = new Set(filterMappedDevices(devices).map(device => device.device_id));
  return devices.filter(device => !mappedIds.has(device.device_id));
}

export function connectionStateForChannelStatus(status, online = true) {
  if (!online) return 'polling_fallback';
  if (status === 'SUBSCRIBED') return 'live';
  if (status === 'CONNECTING') return 'reconnecting';
  return 'polling_fallback';
}

export function liveDashboardReducer(state, action) {
  switch (action.type) {
    case 'reset':
      return EMPTY_LIVE_DASHBOARD;
    case 'connection':
      return { ...state, connectionState: action.value };
    case 'refresh_start':
      return { ...state, refreshing: true };
    case 'refresh_end':
      return { ...state, refreshing: false };
    case 'reconcile':
      return {
        ...state,
        ...action.datasets,
        ...(action.datasets.devices && { devices: sortedDevices(action.datasets.devices) }),
        ...(action.datasets.mapDevices && { mapDevices: sortedDevices(action.datasets.mapDevices) }),
        ...(action.datasets.deviceRegistry && {
          deviceRegistry: sortedDevices(action.datasets.deviceRegistry),
        }),
        activity: action.datasets.activity
          ? upsertByKey(state.activity, action.datasets.activity, 'runtime_event_id')
          : state.activity,
        candidates: action.datasets.candidates
          ? upsertByKey(state.candidates, action.datasets.candidates, 'candidate_event_id')
          : state.candidates,
        errors: action.errors,
        loading: false,
        reconciledAt: action.complete ? action.at : state.reconciledAt,
      };
    case 'upsert_activity':
      return {
        ...state,
        activity: upsertByKey(state.activity, {
          ...action.row,
          live_arrival_at: action.live ? action.at : action.row.live_arrival_at,
        }, 'runtime_event_id'),
      };
    case 'set_activity_summary':
      return { ...state, activitySummary: action.row };
    case 'upsert_candidate':
      return {
        ...state,
        candidates: upsertByKey(state.candidates, action.row, 'candidate_event_id'),
      };
    case 'upsert_relay':
      return {
        ...state,
        relays: upsertByKey(state.relays, action.row, 'relay_episode_key'),
      };
    case 'upsert_device':
      return {
        ...state,
        devices: upsertDevices(state.devices, action.row),
      };
    case 'upsert_map':
      return {
        ...state,
        mapDevices: upsertDevices(state.mapDevices, action.rows),
      };
    case 'upsert_registry':
      return {
        ...state,
        deviceRegistry: upsertDevices(state.deviceRegistry, action.row),
      };
    default:
      return state;
  }
}
