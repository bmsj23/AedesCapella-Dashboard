import { C } from '../../constants/colors';
import EmptyState from '../../components/ui/EmptyState';
import Mono from '../../components/ui/Mono';
import Tag from '../../components/ui/Tag';
import TablePlate from '../../components/ui/TablePlate';
import {
  ACTIVITY_TABLE_HEADERS,
  getActivityTimePresentation,
  getEventPresentation,
  plainReason,
} from '../../utils/dashboardData';
import { formatDeviceName } from '../../utils/viewer';

const COLUMNS = ['20%', '18%', '18%', '20%', '24%'];

function deviceLabel(deviceId, deviceLabels) {
  const stored = deviceLabels[deviceId];
  if (stored) return formatDeviceName(stored);
  return deviceId ? `Device ${deviceId.slice(0, 4)}` : 'Unknown device';
}

/** Recent sensor activity table with plain-language labels. */
export default function FeedTable({ events = [], deviceLabels = {}, loading = false, error = '' }) {

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

  return (
    <TablePlate
      title="What The Devices Recorded"
      note={`Showing the ${events.length} most recent`}
      label="Activity"
      fig="SEC.01"
      headers={ACTIVITY_TABLE_HEADERS}
      columns={COLUMNS}
      rows={events}
      resetScrollOn={events}
      renderRow={(event, index) => {
        const presentation = getEventPresentation(event.event_kind);
        const isNewCandidate = event.temporal_candidate && Boolean(event.live_arrival_at);
        const time = getActivityTimePresentation(event);

        return (
              <tr
                className="activity-feed-row"
                key={event.runtime_event_id || `${event.device_id}-${event.c3_boot}-${event.ordinal}`}
                style={{
                  boxShadow: isNewCandidate ? `inset 3px 0 var(--pd-accent)` : 'none',
                  animation: index === 0 ? 'fadeIn 0.5s ease' : 'none',
                }}
              >
                <td className="activity-happened" data-label="When it happened">
                  <Mono size="12px" color={time.happenedAt ? C.textDim : C.amber} style={{ fontWeight: 700 }} title={time.happenedTitle}>
                    {time.happenedLabel}
                  </Mono>
                  <div className="activity-time-quality">
                    <Tag color={time.qualityTone}>{time.qualityLabel}</Tag>
                  </div>
                </td>
                <td className="activity-received" data-label="When received">
                  <Mono size="12px" color={C.textDim} title={time.receivedTitle}>
                    {time.receivedLabel}
                  </Mono>
                </td>
                <td className="activity-device" data-label="Device">
                  <Mono size="12px" color={C.text} style={{ fontWeight: 700 }}>
                    {event.device_label
                      ? formatDeviceName(event.device_label)
                      : deviceLabel(event.device_id, deviceLabels)}
                  </Mono>
                </td>
                <td className="activity-kind" data-label="What happened">
                  <Tag color={presentation.color}>{presentation.label}</Tag>
                  {/* {event.temporal_candidate && (
                    <Mono size="11px" color={C.textDim} style={{ display: 'block', marginTop: '5px' }}>
                      {isNewCandidate ? 'just came in' : 'please check'}
                    </Mono>
                  )} */}
                </td>
                <td className="activity-notes" data-label="Notes">
                  <Mono size="12px" color={C.textDim} style={{ lineHeight: 1.45 }}>
                    {event.time_quality === 'unresolved'
                      ? 'Sent after reconnecting. The event time is unavailable.'
                      : event.temporal_candidate
                        ? 'Likely an Aedes aegypti sound.'
                        : plainReason(event.reason)}
                  </Mono>
                  {time.delay && <Tag color="amber">Arrived {time.delay}</Tag>}
                </td>
              </tr>
            );
      }}
    />
  );
}
