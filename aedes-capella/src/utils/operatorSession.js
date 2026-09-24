/*
 * Keeping a health worker signed in.
 *
 * Supabase issues a one-hour access token and a refresh token that never
 * expires on its own (it is single-use and rotates on every refresh). A sign-in
 * therefore lasts as long as the dashboard keeps trading the refresh token in,
 * and ends only when the user logs out or Supabase rejects the token.
 *
 * The session used to live in sessionStorage and was thrown away as soon as the
 * one-hour access token lapsed, so closing the tab, or leaving the laptop asleep
 * over lunch, meant typing the password again. It now lives in localStorage, and
 * an expired access token is a reason to refresh, not to log out.
 */

export const SESSION_KEY = 'aedes-capella-operator-session-v1';

// Refresh this long before the access token lapses, so no request goes out
// with a token that dies in flight.
export const REFRESH_MARGIN_MS = 60_000;

// A refresh that fails for any reason other than Supabase rejecting the token
// (no internet, a 5xx) is retried rather than ending the session.
export const RETRY_DELAY_MS = 30_000;

export function parseStoredSession(raw) {
  if (!raw) return null;

  try {
    const session = JSON.parse(raw);
    return session?.accessToken && session.refreshToken && Number.isFinite(session.expiresAt)
      ? session
      : null;
  } catch {
    return null;
  }
}

export function refreshDelay(session, now = Date.now()) {
  return Math.max(0, session.expiresAt - now - REFRESH_MARGIN_MS);
}

export function needsRefresh(session, now = Date.now()) {
  return refreshDelay(session, now) === 0;
}

/*
 * Only an explicit rejection from the auth server ends a session: 400 is what
 * Supabase returns for an invalid or already-used refresh token, 401 and 403
 * for a revoked one. Anything without a status is a network failure, and a
 * health worker whose wifi dropped must not be logged out for it.
 */
export function isAuthRejection(error) {
  return [400, 401, 403].includes(error?.status);
}

/*
 * Refresh tokens rotate, so two tabs refreshing with the same token would have
 * the slower one rejected. Before refreshing, and before treating a rejection
 * as final, check whether another tab already stored a newer session.
 */
export function newerStoredSession(current, stored) {
  if (!stored || !current) return null;
  return stored.refreshToken !== current.refreshToken && stored.expiresAt > current.expiresAt
    ? stored
    : null;
}
