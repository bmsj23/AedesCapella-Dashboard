import TechnicalTerm from './TechnicalTerm';
const TONES = new Set(['amber', 'red', 'green', 'gray']);
const ALIASES = { indigo: 'green', teal: 'green', violet: 'red', slate: 'gray', neutral: 'gray', blue: 'gray' };
export default function Tag({ children, color = 'gray', icon: Icon }) {
  const paletteTone = ALIASES[color] || color;
  const tone = TONES.has(paletteTone) ? paletteTone : 'gray';
  return <span className={'pd-tag pd-tag-' + tone + (Icon ? ' pd-tag-iconed' : '')}>
    {Icon ? <Icon size={13} aria-hidden="true" /> : null}
    <TechnicalTerm>{children}</TechnicalTerm>
  </span>;
}
