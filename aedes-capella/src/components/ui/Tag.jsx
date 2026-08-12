const TONES = new Set(['amber', 'red', 'green', 'gray', 'blue']);

/**
 * Status chip.
 *
 * Styling lives in `.pd-tag` rather than in inline styles so the chip obeys the
 * same ring-inset rule as the rest of the system, and so the square marker can
 * be drawn from a pseudo-element instead of an extra span at every call site.
 *
 * @param {string} color - 'amber' | 'red' | 'green' | 'gray' | 'blue'
 */
export default function Tag({ children, color = 'gray' }) {
  const tone = TONES.has(color) ? color : 'gray';

  return (
    <span className={`pd-tag pd-tag-${tone}`}>
      {children}
    </span>
  );
}
