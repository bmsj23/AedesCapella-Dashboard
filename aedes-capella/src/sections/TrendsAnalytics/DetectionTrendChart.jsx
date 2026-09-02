import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { C } from '../../constants/colors';
import { DETECTION_TERM, DETECTION_TERM_UPPER } from '../../constants/terminology';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import { buildActivitySeries } from '../../utils/dashboardData';

const VIEWS = [
  { key: 'today', label: '24 HOURS' },
  { key: 'week', label: '7 DAYS' },
  { key: 'month', label: '30 DAYS' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '10px 14px' }}>
      <div style={{ fontFamily: 'var(--font-data)', fontSize: '12px', color: C.textDim }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-data)', fontSize: '14px', color: C.amber, marginTop: '4px' }}>
        {payload[0].value} {payload[0].value === 1 ? DETECTION_TERM.inlineSingular : DETECTION_TERM.inlinePlural}
      </div>
    </div>
  );
};

/** Device-activity trend with plain labels. */
export default function DetectionTrendChart({ candidates = [] }) {
  const [view, setView] = useState('today');
  const activeData = buildActivitySeries(candidates, view);

  return (
    <Card style={{ marginBottom: '20px', background: C.surface2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '16px', fontWeight: 700, color: C.textDim, letterSpacing: '0.08em' }}>
          {DETECTION_TERM_UPPER.plural} OVER TIME · PHILIPPINE TIME
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {VIEWS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              style={{
                padding:       '4px 12px',
                borderRadius:  '6px',
                border:        `1px solid ${view === key ? C.amber : C.border}`,
                background:    view === key ? `${C.amber}22` : 'transparent',
                color:         view === key ? C.amber : C.textDim,
                fontFamily:    'var(--font-data)',
                fontSize:      '12px',
                cursor:        'pointer',
                fontWeight:    600,
                letterSpacing: '0.05em',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {candidates.length === 0 && <EmptyState title={`No ${DETECTION_TERM.inlinePlural} in this period`} message="Time slots with none recorded are shown as zero." compact />}
      <div aria-label={`${DETECTION_TERM.plural} over time, including time slots with none`}>
        <ResponsiveContainer width="100%" height={220}>
          {/* A negative left margin used to pull the value axis off the plot,
              clipping its labels against the plate edge. */}
          <LineChart data={activeData} margin={{ top: 5, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={`${C.border}cc`} vertical={false} />
            {/* Every bucket carries a label, so at a day's worth of slots they
                overprinted each other. Drop as many as collide and keep the
                first and last, which are the ones that fix the period. */}
            <XAxis
              dataKey="t"
              interval="preserveStartEnd"
              minTickGap={36}
              tickMargin={8}
              tick={{ fontFamily: 'var(--font-data)', fontSize: 11, fill: C.textDim }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              width={34}
              tickMargin={6}
              tick={{ fontFamily: 'var(--font-data)', fontSize: 12, fill: C.textDim }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="v" stroke={C.amber} strokeWidth={2} dot={{ fill: C.amber, r: 3 }} activeDot={{ r: 5, fill: C.amber }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
