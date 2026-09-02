/*
 * A chip's colour states how urgent something is, and nothing else.
 *
 * The five tones are the whole scale, and the legend in PaletteGuide is its
 * only documentation:
 *
 *   green    Okay
 *   amber    Check soon
 *   red      Needs action
 *   gray     No information
 *   neutral  Recorded, nothing to do
 *
 * Blue was removed rather than documented. It was carrying a sixth, unstated
 * meaning: "informational", which is what neutral now says out loud. What kind
 * of thing a chip describes is carried by its text and, in the activity feed,
 * by an icon; never by its colour. An unknown tone falls back to gray, which
 * claims the least.
 */
const TONES = new Set([
  /* Severity. Drawn as a filled pill, because someone may have to act. */
  'amber', 'red', 'green', 'gray', 'neutral',
  /*
   * Kind. Drawn as coloured text and a coloured icon with no fill behind them,
   * so the activity feed can say what sort of event a row is without borrowing
   * the severity scale and implying something is wrong. See the kind-tone block
   * in index.css for why these sit outside amber/red/green.
   */
  'indigo', 'slate', 'teal', 'violet',
]);

/**
 * Status chip.
 *
 * Styling lives in `.pd-tag` rather than in inline styles so the chip obeys the
 * same ring-inset rule as the rest of the system, and so the square marker can
 * be drawn from a pseudo-element instead of an extra span at every call site.
 *
 * An `icon` takes the place of the square marker rather than sitting beside it:
 * both are the chip's leading glyph, and showing two reads as decoration. The
 * icon is hidden from assistive technology because the chip's own text already
 * says what it is.
 *
 * @param {string} color - severity: 'green' | 'amber' | 'red' | 'gray' | 'neutral'
 *                         kind:     'indigo' | 'slate' | 'teal' | 'violet'
 * @param {Function} [icon] - a lucide-react component, drawn in place of the marker
 */
export default function Tag({ children, color = 'gray', icon: Icon }) {
  const tone = TONES.has(color) ? color : 'gray';

  return (
    <span className={`pd-tag pd-tag-${tone}${Icon ? ' pd-tag-iconed' : ''}`}>
      {Icon ? <Icon size={13} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
