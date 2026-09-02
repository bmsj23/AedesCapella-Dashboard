/*
 * Who is looking at the screen, and therefore how much engineering detail the
 * screen may show.
 *
 * The dashboard's normal audience is barangay health workers, so the default
 * everywhere is the plain view. Model probabilities, boot/sequence numbers,
 * ring ordinals, free heap and raw dBm are meaningless to them and invite
 * misreading, so those are shown only to roles that maintain the system.
 *
 * Least privilege on failure: an unknown or unfetched role is treated as
 * non-technical rather than assumed to be staff.
 */

export const TECHNICAL_ROLES = Object.freeze(['admin', 'technical_personnel']);

export function isTechnicalRole(role) {
  return TECHNICAL_ROLES.includes(role);
}

/**
 * Display name for a device.
 *
 * Stored labels look like "aedescapella-unit-1", which tells nobody anything
 * useful: the prefix repeats the product name on every row and the reader has
 * to parse a slug to learn it is device 1. Every viewer gets "Device 1".
 *
 * This is deliberately not gated on the technical role. Maintainers identify
 * hardware by the device id, which the device cards already print beside the
 * name, so showing the slug bought nothing and cost consistency: the same
 * device was called two different things depending on who was signed in.
 */
export function formatDeviceName(label) {
  if (!label) return 'Unknown device';

  const match = String(label).match(/(\d+)\s*$/);
  return match ? `Device ${Number(match[1])}` : label;
}
