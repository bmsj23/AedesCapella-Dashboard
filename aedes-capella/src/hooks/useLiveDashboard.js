import { useCallback, useEffect, useReducer, useRef } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import {
  fetchActivitySummary,
  fetchCandidateActivity,
  fetchCandidateActivityById,
  fetchDeviceMap,
  fetchDeviceMapById,
  fetchDeviceMapByLocation,
  fetchDeviceStatus,
  fetchDeviceStatusById,
  fetchRelayActivity,
  fetchRelayActivityForSource,
  fetchRuntimeActivity,
  fetchRuntimeActivityById,
} from '../lib/supabaseApi';
import { getFriendlyError } from '../utils/userMessages';
import { isOperatorActivityEvent } from '../utils/dashboardData';
import {
  connectionStateForChannelStatus,
  EMPTY_LIVE_DASHBOARD,
  liveDashboardReducer,
} from '../utils/liveDashboard';

const RECONCILE_INTERVAL_MS = 30_000;
const RELAY_EVENT_KINDS = new Set([
  'RELAY_INTENT',
  'RELAY_ON',
  'RELAY_OFF',
  'RELAY_REJECT',
  'COOLDOWN_COMPLETE',
]);

const SOURCES = [
  ['activity', fetchRuntimeActivity],
  ['candidates', fetchCandidateActivity],
  ['relays', fetchRelayActivity],
  ['devices', fetchDeviceStatus],
  ['mapDevices', fetchDeviceMap],
  ['activitySummary', fetchActivitySummary],
];

export function useLiveDashboard(accessToken) {
  const [state, dispatch] = useReducer(liveDashboardReducer, EMPTY_LIVE_DASHBOARD);
  const controllersRef = useRef(new Set());

  const withController = useCallback(async work => {
    const controller = new AbortController();
    controllersRef.current.add(controller);
    try {
      return await work(controller.signal);
    } finally {
      controllersRef.current.delete(controller);
    }
  }, []);

  const reconcile = useCallback(async suppliedArgument => {
    if (!accessToken) return;

    /*
     * This is returned as `refresh`, so a caller writing onClick={refresh}
     * hands us a React click event. Passing that on as `signal` makes fetch
     * throw "Failed to execute 'fetch' on 'Window'..." before any request
     * leaves the browser. Every source then fails at once, and because the
     * message contains the word "fetch", getFriendlyError reports it as a lost
     * internet connection -- so a working dashboard claimed to be offline and
     * only recovered on the next 30-second reconcile.
     *
     * The call sites are fixed, but anything that is not an AbortSignal is
     * ignored here too: the next onClick={refresh} must not resurrect this.
     */
    const suppliedSignal = suppliedArgument instanceof AbortSignal
      ? suppliedArgument
      : undefined;

    const run = async signal => {
      const results = await Promise.allSettled(
        SOURCES.map(([, fetcher]) => fetcher(accessToken, signal)),
      );
      if (signal?.aborted) return;

      const datasets = {};
      const errors = {};
      results.forEach((result, index) => {
        const [key] = SOURCES[index];
        if (result.status === 'fulfilled') {
          datasets[key] = result.value;
        } else if (result.reason?.name !== 'AbortError') {
          errors[key] = getFriendlyError(
            result.reason,
            'This live information is unavailable right now.',
          );
        }
      });

      if (signal?.aborted) return;

      dispatch({
        type: 'reconcile',
        datasets,
        errors,
        complete: Object.keys(errors).length === 0,
        at: new Date(),
      });
    };

    if (suppliedSignal) return run(suppliedSignal);
    return withController(run);
  }, [accessToken, withController]);

  const hydrateDevice = useCallback((deviceId, signal) => Promise.allSettled([
    fetchDeviceStatusById(accessToken, deviceId, signal).then(row => {
      if (row) dispatch({ type: 'upsert_device', row });
    }),
    fetchDeviceMapById(accessToken, deviceId, signal).then(row => {
      if (row) dispatch({ type: 'upsert_map', rows: row });
    }),
  ]), [accessToken]);

  const hydrateRuntimeEvent = useCallback(async (event, signal) => {
    const eventId = event.runtime_event_id;
    const tasks = [
      hydrateDevice(event.device_id, signal),
      fetchActivitySummary(accessToken, signal).then(row => {
        if (row) dispatch({ type: 'set_activity_summary', row });
      }),
    ];

    if (isOperatorActivityEvent(event)) {
      tasks.push(fetchRuntimeActivityById(accessToken, eventId, signal).then(row => {
        if (row) dispatch({ type: 'upsert_activity', row, live: true, at: Date.now() });
      }));
    }

    if (event.event_kind === 'LIVE_ACCEPT') {
      tasks.push(fetchCandidateActivityById(accessToken, eventId, signal).then(row => {
        if (row) dispatch({ type: 'upsert_candidate', row });
      }));
    }

    if (RELAY_EVENT_KINDS.has(event.event_kind)) {
      tasks.push(fetchRelayActivityForSource(
        accessToken,
        event.device_id,
        event.source_boot,
        event.source_sequence,
        signal,
      ).then(row => {
        if (row) dispatch({ type: 'upsert_relay', row });
      }));
    }

    await Promise.allSettled(tasks);
  }, [accessToken, hydrateDevice]);

  useEffect(() => {
    if (!accessToken) {
      dispatch({ type: 'reset' });
      return undefined;
    }

    const controller = new AbortController();
    const initial = window.setTimeout(() => reconcile(controller.signal), 0);
    const interval = window.setInterval(() => reconcile(controller.signal), RECONCILE_INTERVAL_MS);
    const handleFocus = () => reconcile();
    const handleOnline = () => {
      dispatch({ type: 'connection', value: 'reconnecting' });
      reconcile();
    };
    const handleOffline = () => dispatch({ type: 'connection', value: 'polling_fallback' });

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      controller.abort();
      window.clearTimeout(initial);
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [accessToken, reconcile]);

  useEffect(() => {
    if (!accessToken) return undefined;
    const client = getSupabaseClient();
    if (!client) {
      dispatch({ type: 'connection', value: 'polling_fallback' });
      return undefined;
    }

    let disposed = false;
    let channel;
    const controller = new AbortController();

    async function subscribe() {
      dispatch({ type: 'connection', value: 'reconnecting' });
      await client.realtime.setAuth(accessToken);
      if (disposed) return;

      channel = client
        .channel('operator-dashboard-live')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'edge_c3_runtime_events' },
          payload => hydrateRuntimeEvent(payload.new, controller.signal),
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'device_health_heartbeat' },
          payload => hydrateDevice(payload.new.device_id, controller.signal),
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'devices' },
          payload => hydrateDevice(payload.new.device_id, controller.signal),
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'locations' },
          payload => fetchDeviceMapByLocation(
            accessToken,
            payload.new.location_id,
            controller.signal,
          ).then(rows => dispatch({ type: 'upsert_map', rows })),
        )
        .subscribe(status => {
          dispatch({
            type: 'connection',
            value: connectionStateForChannelStatus(status, navigator.onLine),
          });
          if (status === 'SUBSCRIBED') reconcile();
        });
    }

    subscribe().catch(() => {
      if (!disposed) dispatch({ type: 'connection', value: 'polling_fallback' });
    });

    return () => {
      disposed = true;
      controller.abort();
      if (channel) client.removeChannel(channel);
    };
  }, [accessToken, hydrateDevice, hydrateRuntimeEvent, reconcile]);

  useEffect(() => () => {
    controllersRef.current.forEach(controller => controller.abort());
    controllersRef.current.clear();
  }, []);

  /*
   * Manual refresh, as opposed to the 30-second reconcile. It reports itself so
   * the button can say "Refreshing…" over data that stays on screen throughout.
   * refresh_end is in a finally: reconcile returns early when there is no
   * access token, and a flag that never cleared would disable the button.
   */
  const refresh = useCallback(async () => {
    dispatch({ type: 'refresh_start' });
    try {
      await reconcile();
    } finally {
      dispatch({ type: 'refresh_end' });
    }
  }, [reconcile]);

  return { ...state, refresh };
}
