import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { formatDashboardTimestamp } from '../../utils/dashboardData';
import {
  addMapTilerKey,
  describeMapError,
  isMapVisuallyComplete,
  MAP_READY_EVENTS,
  shouldEscalateMapFailure,
} from '../../utils/mapConfig';

// MapLibre GL JS 6 resolves its worker relative to the bundled chunk, which in a
// Vite build is `/assets/maplibre-gl-worker.mjs` and does not exist. Without a
// worker no vector tile is ever parsed, so the style background paints and every
// road, label, and area stays blank. Vite's `?worker&url` pipeline emits the
// worker together with its shared dependency as one self-contained asset.
maplibregl.setWorkerUrl(workerUrl);

const STATE_COLORS = {
  online: '#16a34a',
  stale: '#f59e0b',
  offline: '#64748b',
  never_seen: '#64748b',
  logging_fault: '#dc2626',
};

function appendText(parent, tagName, text, className) {
  const element = document.createElement(tagName);
  element.textContent = text;
  if (className) element.className = className;
  parent.append(element);
  return element;
}

function appendRecentRows(parent, label, rows, timestampKey) {
  const list = document.createElement('div');
  list.className = 'map-popup-list';
  appendText(list, 'strong', label);

  if (rows.length) {
    rows.slice(0, 3).forEach(row => appendText(list, 'span', formatDashboardTimestamp(row[timestampKey])));
  } else {
    appendText(list, 'span', 'None in loaded history');
  }
  parent.append(list);
}

function buildPopup(device, candidates, relays) {
  const popup = document.createElement('div');
  popup.className = 'map-popup';
  const state = device.operational_state || 'offline';
  const tone = state === 'online' ? 'green' : state === 'logging_fault' ? 'red' : 'amber';

  appendText(popup, 'strong', device.device_label || 'Unnamed device');
  appendText(popup, 'span', `${device.location_name || 'Location not named'} · ${device.barangay_name || 'Barangay not named'}`);
  appendText(popup, 'span', state.replace('_', ' '), `pd-tag pd-tag-${tone}`);
  appendText(
    popup,
    'span',
    `${device.candidates_last_24h ?? 0} possible matches · ${device.relay_activations_last_24h ?? 0} sprayer activations / 24h`,
  );
  appendText(popup, 'span', `Latest activity: ${formatDashboardTimestamp(device.latest_activity_at)}`);
  appendRecentRows(popup, 'Recent Candidates', candidates, 'display_time');
  appendRecentRows(popup, 'Recent Relay Episodes', relays, 'display_time');
  return popup;
}

export default function MapLibreDeviceMap({ devices, candidates, relays, styleUrl, apiKey, onFailure, onReady }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const lastFitKeyRef = useRef('');

  useEffect(() => {
    let loaded = false;
    let failureReported = false;
    let resourceErrorCount = 0;
    const reportFailure = (kind, reason = kind) => {
      // Once the basemap has rendered completely it has proven itself; a later
      // failed tile while panning must not throw the operator back to Leaflet.
      if (failureReported || loaded) return;
      if (!shouldEscalateMapFailure({ kind, resourceErrorCount })) return;
      failureReported = true;
      onFailure(reason);
    };

    let map;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: styleUrl,
        center: [121.162, 13.941],
        zoom: 13,
        attributionControl: false,
        transformRequest: url => ({ url: addMapTilerKey(url, apiKey) }),
      });
    } catch {
      reportFailure('initialization');
      return undefined;
    }
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

    let authorizationRejected = false;
    const timeout = window.setTimeout(() => {
      if (!loaded) reportFailure('timeout', authorizationRejected ? 'authorization' : 'timeout');
    }, 30_000);

    map.on('error', event => {
      const diagnostic = describeMapError(event);
      if (diagnostic.kind === 'authorization') authorizationRejected = true;
      resourceErrorCount += 1;
      // MapLibre stops printing errors itself once a listener is attached, so the
      // only record of a failing tile, glyph, or worker is the one written here.
      console.warn('[map] MapLibre resource failure', {
        ...diagnostic,
        occurrence: resourceErrorCount,
        mapLoaded: isMapVisuallyComplete(map),
      });
      if (diagnostic.kind === 'authorization') reportFailure('authorization');
      else reportFailure('resource-error', 'resource');
    });

    const markReadyWhenComplete = () => {
      if (loaded || failureReported || !isMapVisuallyComplete(map)) return;
      loaded = true;
      window.clearTimeout(timeout);
      onReady();
    };
    MAP_READY_EVENTS.forEach(eventName => map.on(eventName, markReadyWhenComplete));

    return () => {
      window.clearTimeout(timeout);
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      mapRef.current = null;
      map.remove();
    };
  }, [apiKey, onFailure, onReady, styleUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = devices.map(device => {
      const state = device.operational_state || 'offline';
      const element = document.createElement('button');
      element.type = 'button';
      element.className = `maplibre-device-marker maplibre-device-marker-${state}`;
      element.style.setProperty('--device-marker-color', STATE_COLORS[state] || STATE_COLORS.offline);
      element.setAttribute('aria-label', `${device.device_label || 'Device'}: ${state.replace('_', ' ')}`);

      const recentCandidates = candidates.filter(row => row.device_id === device.device_id);
      const recentRelays = relays.filter(row => row.device_id === device.device_id);
      const popup = new maplibregl.Popup({ offset: 16, maxWidth: '320px' })
        .setDOMContent(buildPopup(device, recentCandidates, recentRelays));

      return new maplibregl.Marker({ element })
        .setLngLat([Number(device.longitude), Number(device.latitude)])
        .setPopup(popup)
        .addTo(map);
    });

    const fitKey = devices
      .map(device => `${device.device_id}:${device.latitude}:${device.longitude}`)
      .join('|');
    if (fitKey !== lastFitKeyRef.current) {
      lastFitKeyRef.current = fitKey;
      if (devices.length === 1) {
        map.easeTo({ center: [Number(devices[0].longitude), Number(devices[0].latitude)], zoom: 16 });
      } else if (devices.length > 1) {
        const bounds = devices.reduce(
          (nextBounds, device) => nextBounds.extend([Number(device.longitude), Number(device.latitude)]),
          new maplibregl.LngLatBounds(),
        );
        map.fitBounds(bounds, { padding: 32, maxZoom: 16 });
      }
    }

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    };
  }, [candidates, devices, relays]);

  return <div ref={containerRef} className="device-map" aria-label="Live device location map" />;
}
