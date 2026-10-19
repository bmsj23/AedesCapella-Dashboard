import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { C } from '../../constants/colors';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import { buildNodeActivity } from '../../utils/dashboardData';

const tooltipStyle = {
  background:   C.surface,
  border:       `1px solid ${C.border}`,
  borderRadius: '8px',
  fontFamily:   'var(--font-data)',
  fontSize:     '13px',
  color:        C.text,
};


/** Device activity by device. Match strength is not charted for any role. */
export default function DistributionCharts({ events = [], deviceLabels = {} }) {
  const nodeActivity = buildNodeActivity(events, deviceLabels);

  return (
    <div>
      <Card style={{ background: C.surface2 }}>
        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '16px', fontWeight: 700, color: C.textDim, marginBottom: '16px', letterSpacing: '0.08em' }}>
          DEVICE ACTIVITY BY DEVICE
        </div>
        {!nodeActivity.length ? (
          <EmptyState title="No Device Activity Yet" message="This chart will fill when devices send updates." action="Open Device Status and check the power bank and Wi-Fi if devices are offline." compact />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={nodeActivity} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="node" tick={{ fontFamily: 'var(--font-data)', fontSize: 12, fill: C.textDim }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontFamily: 'var(--font-data)', fontSize: 12, fill: C.textDim }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill={C.green} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}
