import { useSyncExternalStore } from 'react';

/*
 * The chrome does not merely restyle at this width, it changes shape: the
 * sidebar and the summary strip stop being page furniture and become the
 * contents of a drawer. That is a different tree, not a different rule, so the
 * breakpoint has to be readable from JavaScript rather than from CSS alone.
 *
 * 900px matches the breakpoint the rest of the stylesheet already uses.
 *
 * The media query list is an external store, so it is read through
 * useSyncExternalStore rather than mirrored into state from an effect; the
 * latter renders once at the wrong width before correcting itself.
 */
export const MOBILE_BREAKPOINT = 900;

const QUERY = `(max-width: ${MOBILE_BREAKPOINT}px)`;

function subscribe(onChange) {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

// No server render in this app, but useSyncExternalStore requires the third
// argument whenever the snapshot touches window.
function getServerSnapshot() {
  return false;
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
