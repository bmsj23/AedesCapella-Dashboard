import { C } from '../../constants/colors';

/**
 * Technical plate.
 *
 * Dashed edge, solid corner brackets, optional gridded figure zone and
 * monospace corner labels. The brackets and the dash are what make this read
 * as draughting rather than as a generic surface, so they are not optional
 * decoration; a plain bordered box is deliberately not offered.
 *
 * @param {boolean} glow      - accent edge and brackets, for rows needing attention
 * @param {boolean} grid      - fill the body with the faint square grid
 * @param {node}    figure    - content for the gridded upper zone
 * @param {string}  label     - left corner label, accent, e.g. "Sensor Status"
 * @param {string}  fig       - right corner label, muted, e.g. "SEC.04"
 * @param {node}    meta      - dot-separated monospace footer
 * @param {string|number} padding - body padding; pass 0 for flush content
 *                                  such as a table that should meet the edge
 * @param {string}  className - extra classes on the plate, for call sites whose
 *                              layout has to change at a breakpoint and so
 *                              cannot live in an inline style object
 */
export default function Card({
  children,
  style = {},
  glow = false,
  grid = false,
  figure = null,
  label = null,
  fig = null,
  meta = null,
  padding = '20px',
  className = '',
}) {
  const hasFigure = figure !== null || label !== null || fig !== null;

  /*
   * `background` is a shorthand: setting it resets background-image, which
   * silently erases the four dashed edge gradients. Call sites reasonably
   * write `style={{ background: C.surface2 }}` to tint a plate, so remap it to
   * background-color here rather than leaving every caller to remember.
   */
  const { background, ...restStyle } = style;

  return (
    <div
      className={`pd-plate${glow ? ' pd-plate-accent' : ''}${className ? ` ${className}` : ''}`}
      style={{
        boxShadow: C.shadow,
        ...restStyle,
        ...(background ? { backgroundColor: background } : {}),
      }}
    >
      {/* Carries the two corners the plate's own pseudo-elements cannot. */}
      <i className="pd-corners" aria-hidden="true" />

      {hasFigure && (
        <div className="pd-figure pd-grid">
          {figure}
          {label && <span className="pd-figlabel pd-figlabel-left">{label}</span>}
          {fig && <span className="pd-figlabel pd-figlabel-right">{fig}</span>}
        </div>
      )}

      {/* Named so a call site can make the body a layout container. The plate
          itself cannot be one: children sit inside this padded wrapper. */}
      <div
        className={`pd-plate-body${grid && !hasFigure ? ' pd-grid' : ''}`}
        style={{ padding }}
      >
        {children}
      </div>

      {meta && <div className="pd-metafoot">{meta}</div>}
    </div>
  );
}
