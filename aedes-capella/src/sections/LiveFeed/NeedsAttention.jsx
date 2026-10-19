import Tag from '../../components/ui/Tag';
import { attentionDevices } from '../../utils/activityGuidance';
import { formatDeviceName } from '../../utils/viewer';

/*
 * One slim strip above the counts, one line per device at High risk or
 * Watch. It answers "which area first" without pushing the activity table
 * off the screen.
 */
export default function NeedsAttention({ dashboardData, deviceStatus }) {
  if (dashboardData?.loading || deviceStatus?.loading) return null;
  const devices = attentionDevices(deviceStatus?.devices, dashboardData?.mapDevices, dashboardData?.candidates);
  const unavailable = deviceStatus?.error || dashboardData?.errors?.mapDevices || dashboardData?.errors?.candidates;

  return (
    <div className="needs-attention" role="status">
      <strong>Needs attention</strong>
      {unavailable && <span>Information may be incomplete. Refresh the page.</span>}
      {!unavailable && !devices.length && <span>No device needs attention right now.</span>}
      {devices.map(device => (
        <span key={device.device_id} className="attention-device">
          {formatDeviceName(device.device_label)}
          <Tag color={device.level.key === 'high' ? 'red' : 'amber'}>{device.level.label}</Tag>
          {device.level.action}.
        </span>
      ))}
    </div>
  );
}
