import { useId, useState } from 'react';
const DEFINITIONS = [
  [/\b(?:aedes score|match score|match strength)\b/i, 'How closely a sound matched Aedes. This is not proof of species. The firmware cutoff is 0.35. Display bands describe score strength only.'],
  [/\bbags?\b/i, 'A bag is one sound check made from several short audio samples.'],
  [/\bcooldown\b/i, 'The wait after a spray activation. The configured wait is 120 seconds.'],
  [/\brelay\b/i, 'The electrical switch for the sprayer. An activation record does not prove that liquid was delivered.'],
  [/\boffline\b/i, 'No recent update reached the service. Check the power bank and Wi-Fi. This does not prove the device is switched off.'],
];
export default function TechnicalTerm({ children }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const text = typeof children === 'string' ? children : '';
  const explanation = text.length < 90 ? DEFINITIONS.find(([pattern]) => pattern.test(text))?.[1] : null;
  if (!explanation) return children;
  return <span className="technical-term">
    <button type="button" aria-describedby={id} aria-expanded={open} onClick={() => setOpen(value => !value)} onBlur={() => setOpen(false)}>{children}</button>
    <span id={id} role="tooltip" className={open ? 'term-explanation is-open' : 'term-explanation'}>{explanation}</span>
  </span>;
}
