import { Palette } from 'lucide-react';
import Card from './Card';
import Mono from './Mono';
import { C, DEVICE_COLORS } from '../../constants/colors';

const MEANINGS = [
  ['Red', 'High risk, a device fault, or a spray action', C.red],
  ['Amber', 'Watch, connecting, or waiting before a spray', C.amber],
  ['Green', 'Normal or online', C.green],
  ['Grey', 'Offline, no data, or a saved record without a risk level', C.gray],
];

function Swatch({ color }) {
  return <span aria-hidden="true" style={{ width: '12px', height: '12px', borderRadius: '50%', background: color, flexShrink: 0 }} />;
}

/* Laid out like Helpful Words: one bordered tile per colour, so each meaning
   reads as its own item instead of one block of text. */
export default function PaletteGuide() {
  return (
    <Card style={{ background: C.surface2 }}>
      <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '9px' }}>
        <Palette size={16} color={C.textDim} />
        <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '16px', fontWeight: 700, color: C.text }}>
          What the Colors Mean
        </span>
      </div>
      <div className="info-grid info-grid-four">
        {MEANINGS.map(([name, meaning, color]) => (
          <div
            key={name}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: '8px',
              padding: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Swatch color={color} />
              <Mono size="14px" color={C.text} style={{ fontWeight: 700 }}>{name}</Mono>
            </div>
            <Mono size="12px" color={C.textDim} style={{ lineHeight: 1.45 }}>{meaning}.</Mono>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: `1px dashed ${C.border}`, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 18px' }}>
        {DEVICE_COLORS.map((color, index) => (
          <span key={color} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Swatch color={color} />
            <Mono size="12px" color={C.text}>Device {index + 1} in charts</Mono>
          </span>
        ))}
        <Mono size="12px" color={C.textDim} style={{ lineHeight: 1.45 }}>
          A red spray record shows a spray action. It does not by itself mean the area is at High risk.
        </Mono>
      </div>
    </Card>
  );
}
