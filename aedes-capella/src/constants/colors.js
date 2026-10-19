export const C = {
  bg: 'var(--color-bg)',
  surface: 'var(--color-surface)',
  surface2: 'var(--color-surface-2)',
  surface3: 'var(--color-surface-3)',
  amber: 'var(--color-amber)',
  amberDim: 'var(--color-amber-dim)',
  red: 'var(--color-red)',
  redDim: 'var(--color-red-dim)',
  green: 'var(--color-green)',
  greenDim: 'var(--color-green-dim)',
  blue: 'var(--color-blue)',
  violet: 'var(--color-violet)',
  gray: 'var(--color-gray)',
  text: 'var(--color-text)',
  textDim: 'var(--color-text-dim)',
  border: 'var(--color-border)',
  borderBright: 'var(--color-border-bright)',
  shadow: 'var(--shadow-card)',
};

/*
 * Chart colours for devices. Blue and violet are outside the four status
 * colours, so a device bar never reads as High risk, Watch or Normal. The
 * colour follows the device number, so Device 1 is the same colour on every
 * chart whatever order the bars are in.
 */
export const DEVICE_COLORS = [C.blue, C.violet];

export function deviceColor(name, index = 0) {
  const number = Number(String(name || '').match(/(\d+)\s*$/)?.[1]);
  const slot = Number.isFinite(number) && number > 0 ? number - 1 : index;
  return DEVICE_COLORS[slot % DEVICE_COLORS.length];
}
