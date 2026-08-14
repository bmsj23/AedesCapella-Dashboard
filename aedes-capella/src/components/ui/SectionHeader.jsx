import { C } from '../../constants/colors';

/**
 * Section heading in the technical-plate language: a tracked accent overline,
 * a heavy display title trailed by an accent lozenge, and a monospace figure
 * number on the right that gives each section a fixed identity.
 *
 * No icon. The overline and the figure number carry the identification, which
 * is how the reference language does it; a glyph in a tinted rounded square
 * beside every title is the generic dashboard tell we are removing.
 *
 * @param {string} overline - tracked uppercase kicker above the title
 * @param {string} fig      - figure number, e.g. "SEC.01"
 * @param {node}   action   - control for the right of the title row, e.g. a
 *                            refresh button; sits above the rule beside fig
 */
export default function SectionHeader({ title, subtitle, overline, fig, action }) {
  return (
    <header style={{
      display:       'flex',
      alignItems:    'flex-start',
      gap:           '16px',
      marginBottom:  '26px',
      paddingBottom: '18px',
      borderBottom:  `1px dashed var(--pd-dash)`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {overline && <span className="pd-overline">{overline}</span>}
        <h2 className="pd-display">
          {title}
          <i className="pd-spark" />
        </h2>
        {subtitle && (
          <p style={{
            marginTop:  '10px',
            /* A measure, not a wrap point: wide enough that a one-line
               subtitle stays on one line, capped so it never runs the full
               width of a desktop. `pretty` keeps the last line from breaking
               to a single orphaned word. */
            maxWidth:   '80ch',
            color:      C.textDim,
            font:       '400 13.5px Outfit, sans-serif',
            lineHeight: 1.55,
            textWrap:   'pretty',
          }}>
            {subtitle}
          </p>
        )}
      </div>

      {(action || fig) && (
        <div style={{
          flexShrink:  0,
          marginTop:   '6px',
          display:     'flex',
          alignItems:  'center',
          gap:         '14px',
        }}>
          {action}
          {fig && (
            <span style={{
              color:         C.gray,
              font:          '500 11px var(--font-plate)',
              letterSpacing: '0.08em',
            }}>
              {fig}
            </span>
          )}
        </div>
      )}
    </header>
  );
}
