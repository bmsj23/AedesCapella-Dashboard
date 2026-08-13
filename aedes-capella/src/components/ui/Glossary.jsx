import { BookOpen } from 'lucide-react';
import { C } from '../../constants/colors';
import Card from './Card';
import Mono from './Mono';

const TERMS = [
  ['Match score', 'How closely a sound matched. It is not proof of the species.'],
  ['Possible mosquito match', 'A sound the sensor matched, confirmed by its timing checks, that still needs a person to review it.'],
  ['Cooldown', 'A recorded pause that prevents spraying activations too close together.'],
  ['Works offline', 'The sensor can check sound even without an internet connection.'],
  ['Relay event', 'A saved command or state change. It does not prove physical fluid delivery.'],
  ['Sensor', 'A field device that evaluates sound and reports health and runtime events.'],
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
