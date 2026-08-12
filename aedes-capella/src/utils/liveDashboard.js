const MAX_ACTIVITY_ROWS = 500;

export const EMPTY_LIVE_DASHBOARD = {
  activity: [],
  activitySummary: null,
  candidates: [],
  relays: [],
  devices: [],
  mapDevices: [],
  errors: {},
  loading: true,
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
    case 'reconcile':
      return {
        ...state,
        ...action.datasets,
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
        devices: upsertByKey(state.devices, action.row, 'device_id', Number.POSITIVE_INFINITY),
      };
    case 'upsert_map':
      return {
        ...state,
        mapDevices: upsertByKey(state.mapDevices, action.rows, 'device_id', Number.POSITIVE_INFINITY),
      };
    default:
      return state;
  }
}
