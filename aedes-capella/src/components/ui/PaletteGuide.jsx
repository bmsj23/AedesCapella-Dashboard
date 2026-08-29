import { C } from '../../constants/colors';
import Card from './Card';
import Mono from './Mono';

/*
 * The whole colour scale, and its only documentation.
 *
 * This legend said colour meant severity while the activity feed used colour
 * for the kind of event, so a normal night of a detection followed by the
 * spray it triggered rendered as "check soon" then "needs action" and sent a
 * barangay worker to inspect a sensor that was working perfectly.
 *
 * Blue was a fifth colour in use and missing from this list, which is how the
 * omission was noticed. It was not added: it was carrying a meaning this scale
 * now states out loud, which is that a thing was recorded and nobody has to do
 * anything about it.
 */
const PALETTE = [
  { name: 'Green', token: '--color-green', meaning: 'Okay', use: 'The sensor is working, or the check finished.', color: C.green },
  { name: 'Amber', token: '--color-amber', meaning: 'Check soon', use: 'Look at this when you can. Nothing is urgent.', color: C.amber },
  { name: 'Red', token: '--color-red', meaning: 'Needs action', use: 'Somebody has to do something about this.', color: C.red },
  { name: 'Slate', token: '--tag-neutral-fill', meaning: 'Recorded', use: 'Something happened and was written down. Nothing to do.', color: 'var(--tag-neutral-fill)' },
  { name: 'Gray', token: '--color-gray', meaning: 'No information', use: 'The sensor is not reporting, or this is not known.', color: C.gray },
];

export default function PaletteGuide() {
  return (
    <Card style={{ background: C.surface2 }}>
      <div style={{
        fontFamily: 'Outfit, sans-serif',
        fontSize: '16px',
        fontWeight: 700,
        color: C.text,
        marginBottom: '14px',
      }}>
        What the Colors Mean
      </div>
      <Mono size="12px" color={C.textDim} style={{ display: 'block', marginBottom: '14px', lineHeight: 1.5, maxWidth: '68ch' }}>
        A color only ever says how urgent something is. What kind of thing
        happened is in the words, and in the small picture on each label in
        Latest Activity. A sensor hearing a mosquito and the sprayer switching
        on are both normal, so neither one turns the screen red.
      </Mono>
      <div className="info-grid info-grid-five">
        {PALETTE.map(item => (
          <div
            key={item.name}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: '8px',
              padding: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '9px' }}>
              <span style={{
                width: '14px',
                height: '14px',
                borderRadius: '3px',
                background: item.color,
                flexShrink: 0,
              }} />
              <Mono size="14px" color={C.text} style={{ fontWeight: 700 }}>{item.name} - {item.meaning}</Mono>
            </div>
            <Mono size="12px" color={C.textDim} style={{ lineHeight: 1.45 }}>{item.use}</Mono>
          </div>
        ))}
      </div>
    </Card>
  );
}
