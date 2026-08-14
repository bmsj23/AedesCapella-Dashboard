import { C } from '../../constants/colors';

/**
 * Info/warning banner strip with icon.
 * @param {string} color - 'blue' | 'amber' | 'red'
 */
export default function Banner({ icon: Icon, text, color = 'blue' }) {
  const COLORS = {
    blue:  { bg: 'var(--banner-blue-bg)', border: 'var(--banner-blue-border)', text: 'var(--banner-blue-text)' },
    amber: { bg: 'var(--banner-amber-bg)', border: 'var(--banner-amber-border)', text: 'var(--banner-amber-text)' },
    red:   { bg: 'var(--banner-red-bg)', border: 'var(--banner-red-border)', text: 'var(--banner-red-text)' },
  };
  const c = COLORS[color] ?? COLORS.blue;

  return (
    <div style={{
      background:    c.bg,
      border:        `1px solid ${c.border}`,
      borderRadius:  '8px',
      padding:       '12px 16px',
      marginBottom:  '20px',
      display:       'flex',
      alignItems:    'center',
      gap:           '10px',
    }}>
      {Icon && <Icon size={16} color={c.text} style={{ flexShrink: 0 }} />}
      <span style={{
        fontFamily: 'var(--font-data)',
        fontSize:   '13px',
        color:      c.text ?? C.text,
        lineHeight:  1.45,
      }}>
        {text}
      </span>
    </div>
  );
}
