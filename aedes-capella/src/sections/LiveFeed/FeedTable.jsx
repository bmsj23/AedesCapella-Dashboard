import { C } from '../../constants/colors';
import EmptyState from '../../components/ui/EmptyState';
import Mono from '../../components/ui/Mono';
import Tag from '../../components/ui/Tag';
import TablePlate from '../../components/ui/TablePlate';
import {
  formatDashboardTimestamp,
  formatShortDashboardTimestamp,
  getEventPresentation,
  plainReason,
} from '../../utils/dashboardData';
import { formatDeviceName } from '../../utils/viewer';
import { useIsTechnical } from '../../contexts/viewerRole';

const HEADERS = ['WHEN IT HAPPENED', 'WHEN RECEIVED', 'DEVICE', 'WHAT HAPPENED', 'TIME', 'NOTES'];
const COLUMNS = ['14%', '14%', '16%', '20%', '14%', '22%'];

function deviceLabel(deviceId, deviceLabels, technical) {
  const stored = deviceLabels[deviceId];
  if (stored) return formatDeviceName(stored, { technical });
  return deviceId ? `Device ${deviceId.slice(0, 4)}` : 'Unknown device';
}

function uploadDelay(event) {
  const occurred = Date.parse(event.occurred_at || '');
  const received = Date.parse(event.received_at || '');
  if (!Number.isFinite(occurred) || !Number.isFinite(received) || received <= occurred + 5 * 60 * 1000) return null;
  const minutes = Math.round((received - occurred) / 60000);
  return minutes >= 60 ? `${Math.round(minutes / 60)}h late` : `${minutes}m late`;
}

function timeWording(timeQuality) {
  if (timeQuality === 'ntp') return { label: 'Device time synchronized', color: C.green };
  if (timeQuality === 'boot_anchor') return { label: 'Time reconstructed from this startup', color: C.textDim };
  return { label: 'Exact event time unavailable', color: C.amber };
}

/** Recent sensor activity table with plain-language labels. */
export default function FeedTable({ events = [], deviceLabels = {}, loading = false, error = '' }) {
  const technical = useIsTechnical();

  if (loading) {
    return (
      <EmptyState
        title="Loading Recent Activity"
        message="Please wait while the latest sensor updates load."
        variant="startup"
      />
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Recent Activity Unavailable"
        message={error}
        action="Check your connection or ask the system administrator, then try again."
        variant="warning"
      />
    );
  }

  if (!events.length) {
    return (
      <EmptyState
        title="No Recent Activity"
        message="No sensor updates are showing right now. This does not prove that everything is okay."
        action="Open Sensor Status and check whether the sensors are reporting."
      />
    );
  }

  const ordinals = events.map(event => event.ordinal).filter(Number.isFinite);
  const ordinalRange = ordinals.length
    ? `records ${Math.min(...ordinals)}–${Math.max(...ordinals)}`
    : null;

  return (
    <TablePlate
      title="What The Devices Recorded"
      note={technical
        ? `${ordinalRange ? `${ordinalRange} · ` : ''}${events.length} rows held`
        : `Showing the ${events.length} most recent`}
      label="Activity"
      fig="SEC.01"
      headers={HEADERS}
      columns={COLUMNS}
      rows={events}
      resetScrollOn={events}
      renderRow={(event, index) => {
        const presentation = getEventPresentation(event.event_kind);
        const isNewCandidate = event.temporal_candidate && Boolean(event.live_arrival_at);
        const delay = uploadDelay(event);
        const time = timeWording(event.time_quality);
        const showReceivedTime = event.time_quality === 'unresolved' || Boolean(delay);

        return (
              <tr
                key={event.runtime_event_id || `${event.device_id}-${event.c3_boot}-${event.ordinal}`}
                style={{
                  boxShadow: isNewCandidate ? `inset 3px 0 var(--pd-accent)` : 'none',
                  animation: index === 0 ? 'fadeIn 0.5s ease' : 'none',
                }}
              >
                <td data-label="When it happened">
                  <Mono size="12px" color={event.occurred_at ? C.textDim : C.amber} style={{ fontWeight: 700 }} title={formatDashboardTimestamp(event.occurred_at)}>
                    {event.occurred_at ? formatShortDashboardTimestamp(event.occurred_at) : formatShortDashboardTimestamp(event.received_at)}
                  </Mono>
                </td>
                <td data-label="When received">
                  <Mono size="12px" color={C.textDim} title={formatDashboardTimestamp(event.received_at)}>
                    {showReceivedTime ? formatShortDashboardTimestamp(event.received_at) : 'Same upload window'}
                  </Mono>
                </td>
                <td data-label="Device">
                  <Mono size="12px" color={C.text} style={{ fontWeight: 700 }}>
                    {event.device_label
                      ? formatDeviceName(event.device_label, { technical })
                      : deviceLabel(event.device_id, deviceLabels, technical)}
                  </Mono>
                </td>
                <td data-label="What happened">
                  <Tag color={presentation.color}>{presentation.label}</Tag>
                  {/* {event.temporal_candidate && (
                    <Mono size="11px" color={C.textDim} style={{ display: 'block', marginTop: '5px' }}>
                      {isNewCandidate ? 'just came in' : 'please check'}
                    </Mono>
                  )} */}
                </td>
                <td data-label="Time">
                  <Mono size="11px" color={time.color} style={{ fontWeight: 700, lineHeight: 1.35 }}>
                    {time.label}
                  </Mono>
                </td>
                <td data-label="Notes" style={{ maxWidth: '280px' }}>
                  <Mono size="12px" color={C.textDim} style={{ lineHeight: 1.45 }}>
                    {event.time_quality === 'unresolved'
                      ? 'Recorded after reconnect; exact event time unavailable.'
                      : event.temporal_candidate
                        ? 'Possible mosquito sound. Needs a person to check.'
                        : plainReason(event.reason)}
                  </Mono>
                  {delay && <Tag color="amber">Data received {delay}</Tag>}
                </td>
              </tr>
            );
      }}
    />
  );
}
