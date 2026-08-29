import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { C } from '../../constants/colors';
import { DETECTION_TERM } from '../../constants/terminology';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import { buildConfidenceDistribution, buildNodeActivity } from '../../utils/dashboardData';

const tooltipStyle = {
  background:   C.surface,
  border:       `1px solid ${C.border}`,
  borderRadius: '8px',
  fontFamily:   'var(--font-data)',
  fontSize:     '13px',
  color:        C.text,
};

const NODE_COLORS = [C.red, C.amber, C.blue, C.gray];
const CONF_COLORS = [C.gray, C.blue, C.amber, C.red];

/** Activity distributions with simple labels. */
export default function DistributionCharts({ events = [], candidates = [], deviceLabels = {} }) {
  const nodeActivity = buildNodeActivity(events, deviceLabels);
  const confidence = buildConfidenceDistribution(candidates);

  return (
    <div className="analytics-grid">
      <Card style={{ background: C.surface2 }}>
        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '16px', fontWeight: 700, color: C.textDim, marginBottom: '16px', letterSpacing: '0.08em' }}>
          SENSOR ACTIVITY BY SENSOR
        </div>
        {!nodeActivity.length ? (
          <EmptyState title="No Sensor Activity Yet" message="This chart will fill when sensors send updates." compact />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={nodeActivity} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={`${C.border}cc`} vertical={false} />
              <XAxis dataKey="node" tick={{ fontFamily: 'var(--font-data)', fontSize: 12, fill: C.textDim }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontFamily: 'var(--font-data)', fontSize: 12, fill: C.textDim }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {nodeActivity.map((entry, index) => <Cell key={entry.node} fill={NODE_COLORS[index % NODE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card style={{ background: C.surface2 }}>
        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '16px', fontWeight: 700, color: C.textDim, marginBottom: '16px', letterSpacing: '0.08em' }}>
          MATCH STRENGTH
        </div>
        {!candidates.length ? (
          <EmptyState title="Nothing To Show Yet" message={`This chart fills in once the sensors record ${DETECTION_TERM.inlinePlural}.`} compact />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={confidence} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={`${C.border}cc`} vertical={false} />
              <XAxis dataKey="range" tick={{ fontFamily: 'var(--font-data)', fontSize: 12, fill: C.textDim }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontFamily: 'var(--font-data)', fontSize: 12, fill: C.textDim }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {confidence.map((entry, index) => <Cell key={entry.range} fill={CONF_COLORS[index]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}
