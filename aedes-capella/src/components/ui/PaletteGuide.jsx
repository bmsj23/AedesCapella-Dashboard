import Card from './Card';
import { C } from '../../constants/colors';
const MEANINGS = [
  ['Red', 'High risk, a device fault, or a spray action', C.red],
  ['Amber', 'Watch, connecting, or waiting before a spray', C.amber],
  ['Green', 'Normal or online', C.green],
  ['Grey', 'Offline, no data, or a saved record without a risk level', C.gray],
];
export default function PaletteGuide() {
  return <Card><h2>What the Colors Mean</h2><div className="info-grid info-grid-four">{MEANINGS.map(([name, meaning, color]) => (
    <div key={name}><strong style={{ color }}>{name}</strong><p>{meaning}.</p></div>
  ))}</div><p>A red spray record shows a spray action. It does not by itself mean the area is at High risk.</p></Card>;
}
