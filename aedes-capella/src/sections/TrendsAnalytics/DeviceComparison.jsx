import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { GitCompareArrows } from 'lucide-react';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Mono from '../../components/ui/Mono';
import Tag from '../../components/ui/Tag';
import { C } from '../../constants/colors';
import { DETECTION_TERM, DETECTION_TERM_UPPER } from '../../constants/terminology';
import {
  buildDeviceComparison,
  COMPARISON_WINDOWS,
} from '../../utils/deviceComparison';
// The fourth copy of "online is green, everything else is amber" lived here.
// One shared reading now answers for all of them.
import { getStatusPresentation } from '../../utils/deviceStatus';
import { formatDeviceName } from '../../utils/viewer';

const BAR_COLORS = [C.amber, C.blue];

function placementSummary(device) {
  if (!device) return 'Placement not recorded';
  const parts = [];
  if (device.location_name) parts.push(`${device.location_name}, ${device.barangay_name}`);
  if (device.placement_distance_m !== null && device.placement_distance_m !== undefined) {
    parts.push(`${device.placement_distance_m} m distance`);
  }
  if (device.placement_height_m !== null && device.placement_height_m !== undefined) {
    parts.push(`${device.placement_height_m} m height`);
  }
  if (device.placement_angle_degrees !== null && device.placement_angle_degrees !== undefined) {
    parts.push(`${device.placement_angle_degrees} deg angle`);
  }
  return parts.join(' / ') || 'Placement not recorded';
}

function ComparisonStat({ label, value }) {
  return (
    <div className="comparison-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function DeviceComparison({ devices = [], registry = [], candidates = [], relays = [] }) {
  const activeRegistryIds = new Set(
    registry
      .filter(device => device.device_status !== 'decommissioned')
      .map(device => device.device_id),
  );
  const selectable = registry.length
    ? devices.filter(device => activeRegistryIds.has(device.device_id))
    : devices;
  const deviceIds = selectable.map(device => device.device_id);
  const [leftSelection, setLeftSelection] = useState('');
  const [rightSelection, setRightSelection] = useState('');
  const [windowKey, setWindowKey] = useState('24h');

  const leftDeviceId = deviceIds.includes(leftSelection) ? leftSelection : deviceIds[0];
  const rightFallback = deviceIds.find(deviceId => deviceId !== leftDeviceId);
  const rightDeviceId = deviceIds.includes(rightSelection) && rightSelection !== leftDeviceId
    ? rightSelection
    : rightFallback;
  const selectedWindow = COMPARISON_WINDOWS.find(window => window.key === windowKey)
    || COMPARISON_WINDOWS[0];

  const comparison = leftDeviceId && rightDeviceId
    ? buildDeviceComparison({
      candidates,
      relays,
      leftDeviceId,
      rightDeviceId,
      hours: selectedWindow.hours,
    })
    : null;

  const deviceById = new Map(selectable.map(device => [device.device_id, device]));
  const registryById = new Map(registry.map(device => [device.device_id, device]));
  const chartData = comparison?.devices.map(row => ({
    name: formatDeviceName(deviceById.get(row.deviceId)?.device_label),
    rate: Number(row.candidatesPerHour.toFixed(3)),
  })) || [];

  return (
    <Card className="device-comparison" style={{ marginBottom: '20px', background: C.surface2 }}>
      <div className="device-comparison-head">
        <div>
          <Mono size="10px" color={C.textDim}>COMPARING TWO SENSORS</Mono>
          <h3>Where the sensors are pointed</h3>
          <p>Compare two sensors over the same period. Both run the same model, so a difference here says something about where they are placed, not about which one is more accurate.</p>
        </div>
        <GitCompareArrows size={24} color={C.amber} aria-hidden="true" />
      </div>

      {selectable.length < 2 ? (
        <EmptyState
          title="Two Active Sensors Required"
          message="Register and provision the second unit before a side-by-side comparison can be calculated."
          compact
        />
      ) : (
        <>
          <div className="device-comparison-controls">
            <label>
              <span>First sensor</span>
              <select value={leftDeviceId} onChange={event => setLeftSelection(event.target.value)}>
                {selectable.map(device => (
                  <option key={device.device_id} value={device.device_id}>{formatDeviceName(device.device_label)}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Second sensor</span>
              <select value={rightDeviceId} onChange={event => setRightSelection(event.target.value)}>
                {selectable.filter(device => device.device_id !== leftDeviceId).map(device => (
                  <option key={device.device_id} value={device.device_id}>{formatDeviceName(device.device_label)}</option>
                ))}
              </select>
            </label>
            <div className="comparison-window" role="group" aria-label="Comparison period">
              {COMPARISON_WINDOWS.map(window => (
                <button
                  key={window.key}
                  type="button"
                  className={window.key === windowKey ? 'is-active' : undefined}
                  onClick={() => setWindowKey(window.key)}
                >
                  {window.label}
                </button>
              ))}
            </div>
          </div>

          <div className="comparison-layout">
            <div className="comparison-table">
              {comparison.devices.map(row => {
                const device = deviceById.get(row.deviceId);
                const registryDevice = registryById.get(row.deviceId);
                return (
                  <div className="comparison-device" key={row.deviceId}>
                    <div className="comparison-device-title">
                      <div>
                        <strong>{formatDeviceName(device?.device_label)}</strong>
                        <span>{placementSummary(registryDevice)}</span>
                      </div>
                      <Tag color={getStatusPresentation(device?.operational_state).color}>
                        {getStatusPresentation(device?.operational_state).label}
                      </Tag>
                    </div>
                    <ComparisonStat label={DETECTION_TERM.plural} value={row.candidates} />
                    <ComparisonStat label="Per hour" value={row.candidatesPerHour.toFixed(3)} />
                    <ComparisonStat label="Times the sprayer switched on" value={row.relayActivations} />
                  </div>
                );
              })}
              <div className="comparison-agreement">
                <span>How often both sensors flagged the same {comparison.agreementWindowSeconds} seconds</span>
                <strong>{comparison.agreementPercent === null ? 'Not available' : `${comparison.agreementPercent.toFixed(1)}%`}</strong>
                <small>{comparison.matchedCandidates} matched pair{comparison.matchedCandidates === 1 ? '' : 's'}</small>
              </div>
            </div>

            <div className="comparison-chart" aria-label={`${DETECTION_TERM.plural} per hour, by sensor`}>
              <Mono size="10px" color={C.textDim}>{DETECTION_TERM_UPPER.plural} PER HOUR</Mono>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 18, right: 8, bottom: 0, left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={`${C.border}cc`} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontFamily: 'var(--font-data)', fontSize: 11, fill: C.textDim }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals tick={{ fontFamily: 'var(--font-data)', fontSize: 11, fill: C.textDim }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={value => [value, `${DETECTION_TERM.plural} per hour`]} />
                  <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => <Cell key={entry.name} fill={BAR_COLORS[index]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {candidates.length >= 500 ? (
            <div className="comparison-data-note">
              The dashboard reached its 500-row limit for this period, so these rates may be incomplete. Export the full records before reading anything into them.
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}
