import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
const DEFINITIONS = [
  [/\b(?:aedes score|match score|match strength)\b/i, 'How closely a sound matched Aedes. This is not proof of species. The firmware cutoff is 0.35. Display bands describe score strength only.'],
  [/\bbags?\b/i, 'A bag is one sound check made from several short audio samples.'],
  [/\bcooldown\b/i, 'The wait after a spray activation. The configured wait is 120 seconds.'],
  [/\brelay\b/i, 'The electrical switch for the sprayer. An activation record does not prove that liquid was delivered.'],
  [/\boffline\b/i, 'No recent update reached the service. Check the power bank and Wi-Fi. This does not prove the device is switched off.'],
];
const WIDTH = 260;
const GAP = 6;

/*
 * The explanation is drawn in a portal with fixed positioning, so a parent
 * with overflow hidden (the sidebar) or a later stacking context (the main
 * panel) cannot clip or cover it. It sits under the word, flips above when
 * there is no room below, and is held inside the window.
 */
function placeNear(rect) {
  const width = Math.min(WIDTH, window.innerWidth * 0.65);
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
  const below = rect.bottom + GAP;
  const roomBelow = window.innerHeight - below;
  return roomBelow < 140
    ? { left, width, bottom: window.innerHeight - rect.top + GAP }
    : { left, width, top: below };
}

export default function TechnicalTerm({ children }) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [position, setPosition] = useState(null);
  const anchorRef = useRef(null);
  const id = useId();
  const text = typeof children === 'string' ? children : '';
  const explanation = text.length < 90 ? DEFINITIONS.find(([pattern]) => pattern.test(text))?.[1] : null;
  if (!explanation) return children;

  const measure = () => {
    if (anchorRef.current) setPosition(placeNear(anchorRef.current.getBoundingClientRect()));
  };
  const open = pinned || hovered;

  return <span
    className="technical-term"
    ref={anchorRef}
    onMouseEnter={() => { measure(); setHovered(true); }}
    onMouseLeave={() => setHovered(false)}
  >
    <button
      type="button"
      aria-describedby={id}
      aria-expanded={open}
      onClick={() => { measure(); setPinned(value => !value); }}
      onFocus={() => { measure(); setHovered(true); }}
      onBlur={() => { setPinned(false); setHovered(false); }}
    >{children}</button>
    {createPortal(
      <span id={id} role="tooltip" className={open && position ? 'term-explanation is-open' : 'term-explanation'} style={position || undefined}>{explanation}</span>,
      document.body,
    )}
  </span>;
}
