import { C } from '../../constants/colors';
import Mono from '../../components/ui/Mono';
import Tag from '../../components/ui/Tag';
import EmptyState from '../../components/ui/EmptyState';
import TablePlate from '../../components/ui/TablePlate';
import { formatDeviceName } from '../../utils/viewer';
import { useIsTechnical } from '../../contexts/viewerRole';
import {
  candidateScorePercent,
  formatDashboardTimestamp,
  formatRelayStatus,
} from '../../utils/dashboardData';

/* The score, boot and sequence columns are engineering evidence. Health
   workers get the six plain columns; maintainers get all nine. */
const HEADERS_PLAIN = ['WHEN', 'DEVICE', 'WHAT HAPPENED', 'HOW LONG', 'NOTES'];
const COLUMNS_PLAIN = ['18%', '14%', '18%', '12%', '38%'];

const HEADERS_TECHNICAL = ['WHEN', 'DEVICE', 'WHAT HAPPENED', 'HOW LONG', 'MATCH SCORE', 'SOURCE', 'NOTES'];
const COLUMNS_TECHNICAL = ['14%', '12%', '14%', '10%', '14%', '14%', '22%'];

export default function FogTable({ relays = [], loading = false, error = '' }) {
  const technical = useIsTechnical();

  if (loading) return <EmptyState title="Loading Spraying History" message="Getting the saved spraying records." variant="startup" />;
  if (error) return <EmptyState title="Spraying History Unavailable" message={error} action="Polling will retry in 30 seconds." variant="warning" />;
  if (!relays.length) {
    return <EmptyState title="No Sprayings Recorded" message="No sprayings have been saved yet. This does not prove that nothing happened." />;
  }

  const episodes = relays.length;
  const started = relays.filter(relay => relay.recorded_relay_activation).length;

  return (
    <TablePlate
      title="Spraying History"
      note={technical
        ? `${episodes} episodes held · ${started} with a recorded activation`
        : `${started} of ${episodes} actually started the sprayer`}
      label="Sprayings"
      fig="SEC.03"
      headers={technical ? HEADERS_TECHNICAL : HEADERS_PLAIN}
      columns={technical ? COLUMNS_TECHNICAL : COLUMNS_PLAIN}
      rows={relays}
      resetScrollOn={relays}
      renderRow={relay => {
        const score = candidateScorePercent(relay);

        return (
          <tr key={relay.relay_episode_key}>
            <td data-label="When"><Mono size="12px" color={C.textDim}>{formatDashboardTimestamp(relay.display_time)}</Mono></td>
            <td data-label="Device"><Mono size="12px" color={C.text} style={{ fontWeight: 700 }}>{formatDeviceName(relay.device_label)}</Mono></td>
            {/* Every one of these is the sprayer behaving normally, including
                a refusal, which is the cooldown working. The status text says
                which one happened; the colour says nobody has to act. */}
            <td data-label="What happened"><Tag color="neutral">{formatRelayStatus(relay.relay_status)}</Tag></td>
            <td data-label="How long"><Mono size="12px">{relay.duration_seconds === null ? 'Not known' : `${Number(relay.duration_seconds).toFixed(1)} sec`}</Mono></td>
            {technical && <td data-label="Match score"><Mono size="12px">{score === null ? 'Not available' : `${score.toFixed(1)}%`}</Mono></td>}
            {technical && <td data-label="Source"><Mono size="11px" color={C.textDim}>boot {relay.source_boot} · seq {relay.source_sequence}</Mono></td>}
            <td data-label="Notes"><Mono size="11px" color={C.textDim}>{relay.rejection_reason || 'Spray Activation.'}</Mono></td>
          </tr>
        );
      }}
    />
  );
}
