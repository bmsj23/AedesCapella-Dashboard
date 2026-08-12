import { usePHTime } from '../../hooks/usePHTime';
import Tag from '../ui/Tag';

/* Average candidate score was removed: it is a model score, and showing it to
   a health worker invites reading it as a confidence in a species. */
const METRICS = [
  { key: 'candidates', label: 'Possible Mosquitoes (24h)' },
  { key: 'relays', label: 'Sprayings (24h)' },
  { key: 'nodes', label: 'Devices Working' },
];

const CONNECTION = {
  live: { label: 'On', color: 'green' },
  reconnecting: { label: 'Connecting', color: 'amber' },
  polling_fallback: { label: 'Slow', color: 'red' },
};

export default function Topbar({ metrics, connectionState, reconciledAt }) {
  const { clock, date } = usePHTime();
  const connection = CONNECTION[connectionState] || CONNECTION.polling_fallback;
  const values = {
    candidates: metrics.loading ? 'Loading…' : metrics.candidateUnavailable ? 'Unavailable' : String(metrics.candidates ?? 0),
    relays: metrics.loading ? 'Loading…' : metrics.relayUnavailable ? 'Unavailable' : String(metrics.relays ?? 0),
    nodes: metrics.loading ? 'Loading…' : metrics.deviceUnavailable ? 'Unavailable' : `${metrics.onlineNodes ?? 0} / ${metrics.totalNodes ?? 0}`,
  };

  return (
    <header className="dashboard-topbar" aria-label="Live dashboard summary">
      {METRICS.map(({ key, label }) => (
        <div key={key} className="topbar-metric">
          <div className="topbar-label">{label}</div>
          <div className="topbar-value">{values[key]}</div>
        </div>
      ))}

      <div className="topbar-metric">
          <div className="topbar-label">Needs Checking</div>
          <div><Tag color={metrics.deviceUnavailable ? 'red' : metrics.totalNodes === 0 ? 'gray' : metrics.attentionNodes ? 'red' : 'green'}>
            {metrics.deviceUnavailable ? 'Unavailable' : metrics.totalNodes === 0 ? 'No device data' : String(metrics.attentionNodes)}
          </Tag></div>
      </div>

      <div className="topbar-connection" role="status" aria-live="polite">
        <div className="topbar-label">Updates</div>
        <Tag color={connection.color}>{connection.label}</Tag>
        <div className="topbar-reconciled">
          {reconciledAt
            ? `Last checked ${reconciledAt.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' })}`
            : 'Waiting for first update'}
        </div>
      </div>

      <div className="topbar-clock">
        <div>{clock}</div>
        <span>{date} PHT</span>
      </div>
    </header>
  );
}
