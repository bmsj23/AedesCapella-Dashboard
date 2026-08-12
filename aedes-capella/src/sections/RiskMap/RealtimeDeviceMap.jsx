import { useEffect, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { C } from '../../constants/colors';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Mono from '../../components/ui/Mono';
import Tag from '../../components/ui/Tag';
import { formatDashboardTimestamp } from '../../utils/dashboardData';
import { filterMappedDevices } from '../../utils/liveDashboard';

const STATE_COLORS = {
  online: '#16a34a',
  stale: '#f59e0b',
  offline: '#64748b',
  never_seen: '#64748b',
  logging_fault: '#dc2626',
};

const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = import.meta.env.VITE_MAP_TILE_ATTRIBUTION || '&copy; OpenStreetMap contributors';

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

export default function RealtimeDeviceMap({ devices = [], candidates = [], relays = [], loading, error }) {
  const [tilesFailed, setTilesFailed] = useState(false);
  const mapped = filterMappedDevices(devices);

  if (loading) return <EmptyState title="Loading Configured Coordinates" message="Reading the live device map view." variant="startup" />;
  if (error) return <EmptyState title="Map Data Unavailable" message={error} action="The 30-second reconciliation will retry." variant="warning" />;
  if (!mapped.length) return <EmptyState title="No Mapped Devices" message="No device currently has a valid latitude and longitude. See Location not mapped below." />;

  return (
    <Card style={{ padding: '12px', marginBottom: '20px' }}>
      <div className="map-heading">
        <div>
          <strong>REAL COORDINATE MAP</strong>
          <Mono size="11px" color={C.textDim}>Approved installation locations · configured map tiles</Mono>
        </div>
        <div className="map-legend" aria-label="Device State Legend">
          {Object.entries(STATE_COLORS).map(([state, color]) => (
            <span key={state}><i style={{ background: color }} />{state.replace('_', ' ')}</span>
          ))}
        </div>
      </div>
      {tilesFailed && (
        <div className="tile-warning" role="status">
          Map tiles are unavailable. Marker data and the complete device list below remain usable.
        </div>
      )}
      <MapContainer className="device-map" center={[13.941, 121.162]} zoom={13} scrollWheelZoom>
        <TileLayer
          attribution={TILE_ATTRIBUTION}
          url={TILE_URL}
          eventHandlers={{ tileerror: () => setTilesFailed(true), load: () => setTilesFailed(false) }}
        />
        <FitMappedDevices devices={mapped} />
        {mapped.map(device => {
          const recentCandidates = candidates.filter(row => row.device_id === device.device_id);
          const recentRelays = relays.filter(row => row.device_id === device.device_id);
          return (
            <CircleMarker
              key={device.device_id}
              center={[Number(device.latitude), Number(device.longitude)]}
              radius={10}
              pathOptions={{
                color: STATE_COLORS[device.operational_state] || STATE_COLORS.offline,
                fillColor: STATE_COLORS[device.operational_state] || STATE_COLORS.offline,
                fillOpacity: 0.8,
                weight: device.operational_state === 'logging_fault' ? 5 : 3,
                dashArray: device.operational_state === 'stale' ? '4 3' : undefined,
              }}
            >
              <Popup minWidth={260}>
                <div className="map-popup">
                  <strong>{device.device_label}</strong>
                  <span>{device.location_name} · {device.barangay_name}</span>
                  <Tag color={device.operational_state === 'online' ? 'green' : device.operational_state === 'logging_fault' ? 'red' : 'amber'}>
                    {device.operational_state.replace('_', ' ')}
                  </Tag>
                  <span>{device.candidates_last_24h ?? 0} possible matches · {device.relay_activations_last_24h ?? 0} sprayer activations / 24h</span>
                  <span>Latest activity: {formatDashboardTimestamp(device.latest_activity_at)}</span>
                  <RecentRows label="Recent Candidates" rows={recentCandidates} timestampKey="display_time" />
                  <RecentRows label="Recent Relay Episodes" rows={recentRelays} timestampKey="display_time" />
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </Card>
  );
}
