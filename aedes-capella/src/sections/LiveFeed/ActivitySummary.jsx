import { C } from '../../constants/colors';
import Card from '../../components/ui/Card';
import Mono from '../../components/ui/Mono';
import Tag from '../../components/ui/Tag';
import { buildRuntimeSummary, formatDashboardTimestamp } from '../../utils/dashboardData';

function Metric({ label, value, tone = C.text, note }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: '8px',
      padding: '14px',
    }}>
      <div className="pd-overline" style={{ color: C.text, marginBottom: '10px' }}>{label}</div>
      <Mono size="22px" color={tone} style={{ fontWeight: 700 }}>{value}</Mono>
      {note && <Mono size="11px" color={C.textDim} style={{ display: 'block', marginTop: '5px' }}>{note}</Mono>}
    </div>
  );
}

export default function ActivitySummary({ events, summary: databaseSummary }) {
  const bufferedSummary = buildRuntimeSummary(events);
  const summary = databaseSummary ? {
    candidateCount: Number(databaseSummary.candidates_all_time || 0),
    relayCount: Number(databaseSummary.relay_activations_all_time || 0),
    unresolvedCount: Number(databaseSummary.unresolved_all_time || 0),
    latestAt: databaseSummary.latest_activity_at,
  } : bufferedSummary;

  return (
    <Card glow style={{ marginBottom: '20px', background: 'var(--pd-accent-dim)' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '12px',
      }}>
        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em', color: C.text }}>
          Quick Summary
        </div>
      </div>

      <div className="info-grid info-grid-three">
        <Metric label="Possible Aedes aegypti matches" value={summary.candidateCount} tone={C.amber} note="All recorded model and timing matches; not confirmed biological detections" />
        <Metric label="Sprayer activations" value={summary.relayCount} tone={C.red} note="All recorded times the relay switched on" />
        <Metric label="Time Not Confirmed" value={summary.unresolvedCount} tone={summary.unresolvedCount ? C.amber : C.green} note={summary.latestAt ? `Latest ${formatDashboardTimestamp(summary.latestAt)}` : 'Nothing recent'} />
      </div>
    </Card>
  );
}
