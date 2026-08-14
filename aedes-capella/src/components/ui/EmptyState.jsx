import { createElement } from 'react';
import { Inbox } from 'lucide-react';
import { C } from '../../constants/colors';
import Card from './Card';
import Mono from './Mono';

const VARIANT_COLORS = {
  default: C.gray,
  offline: C.gray,
  warning: C.amber,
  critical: C.red,
  startup: C.blue,
};

/* Recolours the plate's own dashed edge and brackets. The grey variants keep
   the default edge, so they need no tone. */
const VARIANT_TONES = {
  warning: 'pd-tone-warning',
  critical: 'pd-tone-critical',
  startup: 'pd-tone-info',
};

export default function EmptyState({
  title,
  message,
  action,
  icon: Icon = Inbox,
  variant = 'default',
  compact = false,
}) {
  const accent = VARIANT_COLORS[variant] ?? C.gray;

  return (
    <Card
      className={VARIANT_TONES[variant] || ''}
      style={{
        background: C.surface2,
        padding: compact ? '14px' : '22px',
        textAlign: 'center',
      }}
    >
      {createElement(Icon, { size: compact ? 18 : 22, color: accent })}
      <div style={{
        marginTop: compact ? '8px' : '10px',
        fontFamily: 'Outfit, sans-serif',
        fontSize: compact ? '13px' : '16px',
        fontWeight: 700,
        color: C.text,
      }}>
        {title}
      </div>
      <div style={{ marginTop: '6px' }}>
        <Mono size={compact ? '12px' : '13px'} color={C.textDim} style={{ lineHeight: 1.45 }}>{message}</Mono>
      </div>
      {action && (
        <div style={{ marginTop: compact ? '8px' : '12px' }}>
          <Mono size={compact ? '12px' : '13px'} color={C.textDim} style={{ lineHeight: 1.45 }}>{action}</Mono>
        </div>
      )}
    </Card>
  );
}
