import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { C } from '../../constants/colors';
import { DETECTION_TERM } from '../../constants/terminology';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Mono from '../../components/ui/Mono';
import Tag from '../../components/ui/Tag';
import { formatDashboardTimestamp } from '../../utils/dashboardData';
import { getStatusPresentation } from '../../utils/deviceStatus';
import { filterMappedDevices } from '../../utils/liveDashboard';
import { getMapTilerStyleUrl, mapTilerKey } from '../../utils/mapConfig';
import { formatDeviceName } from '../../utils/viewer';

const MapLibreDeviceMap = lazy(() => import('./MapLibreDeviceMap'));

const STATE_COLORS = {
  online: '#16a34a',
  stale: '#f59e0b',
  offline: '#64748b',
  never_seen: '#64748b',
  logging_fault: '#dc2626',
};

const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = import.meta.env.VITE_MAP_TILE_ATTRIBUTION || '&copy; OpenStreetMap contributors';
const MAPTILER_STYLE_URL = getMapTilerStyleUrl(import.meta.env);
const MAPTILER_API_KEY = mapTilerKey(import.meta.env);

const VECTOR_FAILURE_MESSAGES = {
  authorization: 'MapTiler rejected a map resource. Confirm the protected key allows aedescapella.vercel.app, then redeploy.',
  resource: 'Detailed map resources kept failing to load. OpenStreetMap fallback is active; see the browser console for the failing resource.',
  timeout: 'Detailed map did not finish loading. OpenStreetMap fallback is active; device records remain usable.',
  initialization: 'Detailed map could not start in this browser. OpenStreetMap fallback is active; device records remain usable.',
};

function FitMappedDevices({ devices }) {
  const map = useMap();
  useEffect(() => {
    if (devices.length === 1) {
      map.setView([Number(devices[0].latitude), Number(devices[0].longitude)], 16);
    } else if (devices.length > 1) {
      map.fitBounds(devices.map(device => [Number(device.latitude), Number(device.longitude)]), {
        padding: [32, 32],
        maxZoom: 16,
      });
    }
  }, [devices, map]);
  return null;
}

function RecentRows({ label, rows, timestampKey }) {
  return (
    <div className="map-popup-list">
      <strong>{label}</strong>
      {rows.length ? rows.slice(0, 3).map(row => (
        <span key={row.candidate_event_id || row.relay_episode_key}>
          {formatDashboardTimestamp(row[timestampKey])}
        </span>
      )) : <span>None in loaded history</span>}
    </div>
  );
}

function LeafletDeviceMap({ mapped, candidates, relays, onTileFailure, onTileLoad }) {
  return (
    <MapContainer className="device-map" center={[13.941, 121.162]} zoom={13} scrollWheelZoom>
      <TileLayer
        attribution={TILE_ATTRIBUTION}
        url={TILE_URL}
        eventHandlers={{ tileerror: onTileFailure, load: onTileLoad }}
      />
      <FitMappedDevices devices={mapped} />
      {mapped.map(device => {
        const recentCandidates = candidates.filter(row => row.device_id === device.device_id);
        const recentRelays = relays.filter(row => row.device_id === device.device_id);
        const state = device.operational_state || 'offline';
        // The marker keeps its own colour scale, which is already severity;
        // the chip in the popup reads from the shared presentation so the map
        // and the table beneath it never disagree about a device.
        const status = getStatusPresentation(device.operational_state);
        return (
          <CircleMarker
            key={device.device_id}
            center={[Number(device.latitude), Number(device.longitude)]}
            radius={10}
            pathOptions={{
              color: STATE_COLORS[state] || STATE_COLORS.offline,
              fillColor: STATE_COLORS[state] || STATE_COLORS.offline,
              fillOpacity: 0.8,
              weight: state === 'logging_fault' ? 5 : 3,
              dashArray: state === 'stale' ? '4 3' : undefined,
            }}
          >
            <Popup minWidth={260}>
              <div className="map-popup">
                <strong>{formatDeviceName(device.device_label)}</strong>
                <span>{device.location_name} · {device.barangay_name}</span>
                <Tag color={status.color}>{status.label}</Tag>
                <span>{device.candidates_last_24h ?? 0} {DETECTION_TERM.inlinePlural} · {device.relay_activations_last_24h ?? 0} sprayer activations / 24h</span>
                <span>Latest activity: {formatDashboardTimestamp(device.latest_activity_at)}</span>
                <RecentRows label={`Recent ${DETECTION_TERM.inlinePlural}`} rows={recentCandidates} timestampKey="display_time" />
                <RecentRows label="Recent Sprayings" rows={recentRelays} timestampKey="display_time" />
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

export default function RealtimeDeviceMap({ devices = [], candidates = [], relays = [], loading, error }) {
  const [tilesFailed, setTilesFailed] = useState(false);
  const [vectorFailure, setVectorFailure] = useState(null);
  const mapped = filterMappedDevices(devices);
  const useVectorMap = Boolean(MAPTILER_STYLE_URL) && !vectorFailure;
  const handleVectorFailure = useCallback(reason => setVectorFailure(reason), []);
  const handleVectorReady = useCallback(() => setVectorFailure(null), []);

  if (loading) return <EmptyState title="Loading Configured Coordinates" message="Reading the live device map view." variant="startup" />;
  if (error) return <EmptyState title="Map Data Unavailable" message={error} action="The 30-second reconciliation will retry." variant="warning" />;
  if (!mapped.length) return <EmptyState title="No Mapped Devices" message="No device currently has a valid latitude and longitude. See Location not mapped below." />;

  return (
    <Card style={{ padding: '12px', marginBottom: '20px' }}>
      <div className="map-heading">
        <div>
          <strong>Device Map</strong>
          <Mono size="11px" color={C.textDim}> Installation Location </Mono>
        </div>
      </div>
      {(tilesFailed || vectorFailure) && (
        <div className="tile-warning" role="status">
          {vectorFailure
            ? VECTOR_FAILURE_MESSAGES[vectorFailure] || VECTOR_FAILURE_MESSAGES.timeout
            : 'Map tiles are unavailable. Marker data and the complete device list below remain usable.'}
        </div>
      )}
      {useVectorMap ? (
        <Suspense fallback={<div className="device-map map-loading">Loading detailed map…</div>}>
          <MapLibreDeviceMap
            devices={mapped}
            candidates={candidates}
            relays={relays}
            styleUrl={MAPTILER_STYLE_URL}
            apiKey={MAPTILER_API_KEY}
            onFailure={handleVectorFailure}
            onReady={handleVectorReady}
          />
        </Suspense>
      ) : (
        <LeafletDeviceMap
          mapped={mapped}
          candidates={candidates}
          relays={relays}
          onTileFailure={() => setTilesFailed(true)}
          onTileLoad={() => setTilesFailed(false)}
        />
      )}
    </Card>
  );
}
