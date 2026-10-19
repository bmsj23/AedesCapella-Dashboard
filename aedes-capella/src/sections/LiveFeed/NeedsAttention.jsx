import Card from '../../components/ui/Card';
import Tag from '../../components/ui/Tag';
import { attentionDevices } from '../../utils/activityGuidance';
import { formatDeviceName } from '../../utils/viewer';
import { formatDashboardTimestamp } from '../../utils/dashboardData';

export default function NeedsAttention({ dashboardData, deviceStatus }) {
  const devices = attentionDevices(deviceStatus?.devices, dashboardData?.mapDevices, dashboardData?.candidates);
  const unavailable = deviceStatus?.error || dashboardData?.errors?.mapDevices || dashboardData?.errors?.candidates;
  return (
    <Card className="needs-attention">
      <h2>Needs attention</h2>
      <p>Based on possible sound matches in the last 7 days. These are not confirmed mosquitoes.</p>
      {dashboardData?.loading || deviceStatus?.loading ? <p>Checking devices. Please wait.</p>
        : unavailable ? <p>Attention information may be incomplete. Refresh or ask the administrator to check the connection.</p> : null}
      {devices.map(device => (
        <article key={device.device_id} className="attention-device" style={{ borderLeftColor: device.level.color }}>
          <div><strong>{formatDeviceName(device.device_label)}</strong> <Tag color={device.level.key === 'high' ? 'red' : 'amber'}>{device.level.label}</Tag></div>
          <p>{device.level.action}.</p>
          <small>{device.latestDetection
            ? (device.latestDetection.time_quality === 'unresolved' || !device.latestDetection.occurred_at
              ? 'Detection time unavailable. Last received in loaded history: ' + formatDashboardTimestamp(device.latestDetection.received_at || device.latestDetection.display_time)
              : 'Last detection in loaded history: ' + formatDashboardTimestamp(device.latestDetection.occurred_at))
            : 'Last detection time is not in loaded history. Open the Barangay Map to review the area.'}</small>
        </article>
      ))}
      {!devices.length && !unavailable && !dashboardData?.loading && !deviceStatus?.loading ? <p>No device needs attention right now.</p> : null}
      {!(deviceStatus?.devices?.length || dashboardData?.mapDevices?.length) && !dashboardData?.loading ? <p>No devices are listed. Ask the administrator to add a device, then check the power bank and Wi-Fi.</p> : null}
      <p>Keep checking for standing water. No sound matches does not prove an area is mosquito free.</p>
    </Card>
  );
}
