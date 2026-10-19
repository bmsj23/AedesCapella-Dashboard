import TechnicalTerm from '../../components/ui/TechnicalTerm';
import { C } from '../../constants/colors';
import { DETECTION_TERM } from '../../constants/terminology';
import Card from '../../components/ui/Card';
import Tag from '../../components/ui/Tag';
import { buildRuntimeSummary, formatDashboardTimestamp } from '../../utils/dashboardData';

function peakEventHour(events) {
  const counts = new Map();
  events.forEach(event => {
    const date = new Date(event.display_time);
    if (Number.isNaN(date.getTime())) return;
    const parts = new Intl.DateTimeFormat('en-PH', {
      hour: '2-digit', hour12: false, timeZone: 'Asia/Manila',
    }).formatToParts(date);
    const hour = `${parts.find(part => part.type === 'hour')?.value || '—'}:00`;
    counts.set(hour, (counts.get(hour) || 0) + 1);
  });
  const peak = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
  return peak ? `${peak[0]} · ${peak[1]} rows` : '—';
}

/** Simple activity summary for barangay workers. */
export default function MetricCards({ events = [], candidates = [] }) {
  const runtimeSummary = buildRuntimeSummary(events);
  const metrics = [
    {
      label: DETECTION_TERM.plural,
      value: String(candidates.length),
      sub: candidates.length ? DETECTION_TERM.caveat : 'nothing recorded yet',
      color: C.text,
      status: candidates.length ? 'Available' : 'None recorded',
      statusColor: candidates.length ? 'neutral' : 'gray',
    },
    {
      label: 'Device activities',
      value: String(runtimeSummary.total),
      sub: runtimeSummary.latestAt ? `last seen ${formatDashboardTimestamp(runtimeSummary.latestAt)}` : 'no activity yet',
      color: C.text,
      status: runtimeSummary.total ? 'Available' : 'No activity',
      statusColor: runtimeSummary.total ? 'neutral' : 'gray',
    },
    {
      label: 'Busiest time',
      value: peakEventHour(events),
      sub: 'based on device activity',
      color: C.text,
      // Not amber. The busiest hour of the night is a fact about the
      // records, not a request to go and check anything.
      status: events.length ? 'Available' : 'No activity',
      statusColor: events.length ? 'neutral' : 'gray',
    },
  ];

  return (
    <div className="metric-card-grid metric-card-grid--three">
      {metrics.map(({ label, value, sub, color, status, statusColor }, index) => (
        <Card key={label} style={{ background: C.surface2, padding: '16px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
          }}>
            {/* An amber warning triangle used to appear here when the count
                was zero. A night on which the device heard nothing is a normal
                night, and the chip beside it already says "None recorded". */}
            <Tag color={statusColor}>{status}</Tag>
          </div>
          <div style={{
            fontFamily:    'var(--font-data)',
            fontSize:      '12px',
            color:         C.textDim,
            marginBottom:  '10px',
            letterSpacing: '0.05em',
          }}>
            <span>{label}</span>
          </div>
          <div style={{
            fontFamily:   'var(--font-data)',
            fontSize:     index === 0 ? '24px' : '18px',
            color,
            fontWeight:   700,
            marginBottom: '5px',
            lineHeight:   1.15,
          }}>
            {value}
          </div>
          <div style={{ fontFamily: 'var(--font-data)', fontSize: '12px', lineHeight: 1.45, color: C.textDim }}>
            {sub}
          </div>
        </Card>
      ))}
    </div>
  );
}
