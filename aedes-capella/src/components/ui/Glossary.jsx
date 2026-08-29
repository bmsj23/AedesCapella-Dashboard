import { BookOpen } from 'lucide-react';
import { C } from '../../constants/colors';
import { DETECTION_TERM } from '../../constants/terminology';
import Card from './Card';
import Mono from './Mono';

const TERMS = [
  [DETECTION_TERM.singular, `${DETECTION_TERM.caveat} The sensor matched the sound to Aedes and its timing checks agreed, which is as far as it can go on its own.`],
  ['Match score', 'How closely a sound matched. It is not proof of the species.'],
  ['Cooldown', 'A recorded pause that stops the sprayer switching on again too soon.'],
  ['Works offline', 'The sensor can check sound even without an internet connection.'],
  ['Sprayer event', 'A record that the sprayer was told to switch on, or did. It does not prove that spray reached anything.'],
  ['Sensor', 'A field device that listens, checks what it hears, and reports how it is doing.'],
];

export default function Glossary() {
  return (
    <Card style={{ background: C.surface2 }}>
      <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '9px' }}>
        <BookOpen size={16} color={C.textDim} />
        <span style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: '16px',
          fontWeight: 700,
          color: C.text,
        }}>
          Helpful Words
        </span>
      </div>
      <div className="info-grid info-grid-three">
        {TERMS.map(([term, explanation]) => (
          <div
            key={term}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: '8px',
              padding: '14px',
            }}
          >
            <Mono size="14px" color={C.text} style={{ display: 'block', fontWeight: 700, marginBottom: '8px' }}>
              {term}
            </Mono>
            <Mono size="12px" color={C.textDim} style={{ lineHeight: 1.45 }}>{explanation}</Mono>
          </div>
        ))}
      </div>
    </Card>
  );
}
