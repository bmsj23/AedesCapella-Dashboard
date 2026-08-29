import { C } from '../../constants/colors';
import { DETECTION_TERM } from '../../constants/terminology';
import Card from '../../components/ui/Card';
import Mono from '../../components/ui/Mono';
import { buildRuntimeSummary, manilaStartOfDay } from '../../utils/dashboardData';

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

/*
 * Which day the database actually counted, in words.
 *
 * Read back from the answer rather than assumed. The dashboard asks for
 * midnight in Manila, but a deployment running ahead of migration
 * 202608290006 falls back to a rolling 24 hours, and a panel that says "today"
 * over a rolling count is exactly the kind of quiet lie this section is being
 * fixed to remove.
 */
function describeWindow(databaseSummary) {
  const start = Date.parse(databaseSummary?.window_start || '');
  if (!Number.isFinite(start)) return 'Recent';
  return start === manilaStartOfDay() ? 'Today' : 'Last 24 hours';
}

export default function ActivitySummary({ events, summary: databaseSummary }) {
  const bufferedSummary = buildRuntimeSummary(events);
  /*
   * The windowed counts, not the lifetime ones.
   *
   * These read candidates_all_time and relay_activations_all_time, so the page
   * showed 101 matches and 94 sprays above a table of the last few hours, with
   * no way to scope either. Lifetime totals beside a filtered table is how
   * people misread a dashboard, and the totals told a barangay worker nothing
   * whatever about her day.
   */
  const summary = databaseSummary ? {
    candidateCount: Number(databaseSummary.candidates_in_window || 0),
    relayCount: Number(databaseSummary.relay_activations_in_window || 0),
    latestAt: databaseSummary.latest_activity_at,
  } : bufferedSummary;
  const windowLabel = describeWindow(databaseSummary);

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
          {windowLabel}
        </div>
        <Mono size="11px" color={C.textDim}>Philippine time</Mono>
      </div>

      <div className="info-grid info-grid-two">
        <Metric label={DETECTION_TERM.plural} value={summary.candidateCount} note={DETECTION_TERM.caveat} />
        <Metric label="Sprayer switched on" value={summary.relayCount} note="Times the sprayer was recorded switching on. Not proof that spray reached anything." />
      </div>
    </Card>
  );
}
