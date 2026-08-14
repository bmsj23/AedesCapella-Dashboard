import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { C } from '../../constants/colors';
import Card from '../../components/ui/Card';

export default function HourlyFogChart({ data = [] }) {
  return (
    <Card style={{ marginBottom: '20px', background: C.surface2 }}>
      <div className="chart-title">RECORDED SPRAYING ACTIVATIONS · LAST 12 HOURS · ASIA/MANILA</div>
      <ResponsiveContainer width="100%" height={170}>
        <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={`${C.border}cc`} vertical={false} />
          <XAxis dataKey="hour" tick={{ fontFamily: 'var(--font-data)', fontSize: 11, fill: C.textDim }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontFamily: 'var(--font-data)', fontSize: 12, fill: C.textDim }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text }} />
          <Bar dataKey="relays" name="Recorded activations" fill={C.amber} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
