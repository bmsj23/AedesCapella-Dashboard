import { C } from '../../constants/colors';

/**
 * Inline span for data text: values, timestamps, labels, captions.
 *
 * The name is historical. It set IBM Plex Mono until the interface moved its
 * reading text onto the heading face, and now follows --font-data like every
 * other piece of body copy. Only the SEC.0x plate labels stay monospace, and
 * they do not use this component.
 */
export default function Mono({ children, size = '13px', color, style = {} }) {
  return (
    <span style={{
      fontFamily: 'var(--font-data)',
      fontSize:   size,
      color:      color ?? C.text,
      ...style,
    }}>
      {children}
    </span>
  );
}