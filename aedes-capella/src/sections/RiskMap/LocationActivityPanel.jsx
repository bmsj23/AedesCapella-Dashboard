import { MapPinOff } from 'lucide-react';
import { C } from '../../constants/colors';
import { DETECTION_TERM, DETECTION_TERM_UPPER } from '../../constants/terminology';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Mono from '../../components/ui/Mono';
import Tag from '../../components/ui/Tag';
import { formatDashboardTimestamp } from '../../utils/dashboardData';
import { getStatusPresentation } from '../../utils/deviceStatus';
import { filterMappedDevices, filterUnmappedDevices } from '../../utils/liveDashboard';
import { formatDeviceName } from '../../utils/viewer';

function DeviceTable({ devices, title }) {
  return (
    <Card padding={0} style={{ overflow: 'hidden' }}>
      <div className="table-section-title">{title}</div>
      <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>DEVICE / LOCATION</th><th>STATE</th><th>COORDINATES</th><th>{DETECTION_TERM_UPPER.plural} / 24H</th><th>SPRAYINGS / 24H</th><th>LATEST ACTIVITY</th></tr></thead>
          <tbody>
            {devices.map(device => {
              /*
               * The same reading as the device card, from the same function.
               * This table, both maps and the comparison panel each carried
               * their own copy of the rule, and every copy had drifted to
               * "anything that is not online or a fault is amber", which
               * painted an ordinary offline device as "check soon" and then
               * printed the raw state name at the reader.
               *
               * It also keeps the null guard that this line exists for.
               * dashboard_device_map left-joins dashboard_device_status, so a
               * device absent from that view arrives with a null state, and
               * one such null previously white-screened the whole Barangay
               * Map. getStatusPresentation answers for null and unknown states
               * by construction, so a missing value degrades to a label here
               * rather than to a blank page.
               */
              const status = getStatusPresentation(device.operational_state);
              return (
              <tr key={device.device_id}>
                <td data-label="Device / Location"><Mono size="12px" style={{ fontWeight: 700 }}>{formatDeviceName(device.device_label)}</Mono><Mono size="11px" color={C.textDim} style={{ display: 'block' }}>{device.location_name} · {device.barangay_name}</Mono></td>
                <td data-label="State"><Tag color={status.color}>{status.label}</Tag></td>
                <td data-label="Coordinates"><Mono size="11px" color={C.textDim}>{device.latitude === null || device.longitude === null ? 'Not mapped' : `${device.latitude}, ${device.longitude}`}</Mono></td>
                <td data-label={`${DETECTION_TERM.plural} / 24h`}>{device.candidates_last_24h ?? 0}</td>
                <td data-label="Sprayings / 24h">{device.relay_activations_last_24h ?? 0}</td>
                <td data-label="Latest Activity"><Mono size="11px" color={C.textDim}>{formatDashboardTimestamp(device.latest_activity_at)}</Mono></td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function LocationActivityPanel({ devices = [], loading, error }) {
  if (loading || error || !devices.length) return null;
  const mapped = filterMappedDevices(devices);
  const unmapped = filterUnmappedDevices(devices);

  return (
    <div className="map-data-lists">
      <DeviceTable devices={mapped} title={`Mapped devices · ${mapped.length}`} />
      {unmapped.length ? (
        <div>
          <div className="unmapped-heading"><MapPinOff size={16} /> Location not mapped · {unmapped.length}</div>
          <DeviceTable devices={unmapped} title="Coordinates required from an authorized source" />
        </div>
      ) : (
        <EmptyState title="All configured devices are mapped" message="Every device row has a valid coordinate pair." compact />
      )}
    </div>
  );
}
