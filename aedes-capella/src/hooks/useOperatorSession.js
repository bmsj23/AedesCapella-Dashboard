import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchCurrentUserRole,
  refreshOperatorSession,
  signInWithPassword,
  signOut,
} from '../lib/supabaseApi';
import {
  isAuthRejection,
  needsRefresh,
  newerStoredSession,
  parseStoredSession,
  refreshDelay,
  RETRY_DELAY_MS,
  SESSION_KEY,
} from '../utils/operatorSession';

/*
 * Storage can throw (private windows, blocked site data). A failure there must
 * cost only persistence, never the sign-in the user is looking at.
 */
function readStored() {
  try {
    return parseStoredSession(window.localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function writeStored(session) {
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Signed in for this tab only.
  }
}

function loadSession() {
  if (typeof window === 'undefined') return null;

  const stored = readStored();
  if (stored) return stored;

  // One-time carry-over from the old per-tab store, so an open tab is not
  // logged out by the deploy that fixes the logouts.
  try {
    const legacy = parseStoredSession(window.sessionStorage.getItem(SESSION_KEY));
    window.sessionStorage.removeItem(SESSION_KEY);
    if (legacy) writeStored(legacy);
    return legacy;
  } catch {
    return null;
  }
}

export function useOperatorSession() {
  const [session, setSession] = useState(loadSession);
  const sessionRef = useRef(session);
  const refreshingRef = useRef(null);
  const [retryAt, setRetryAt] = useState(0);
  /*
   * The resolved role is stored against the token it was fetched for, so the
   * effect never has to null it out synchronously on logout: a token that no
   * longer matches simply reads as unresolved. That also closes the window
   * where a stale role could outlive the session it came from.
   *
   * A failed lookup resolves to null, which the viewer context treats as
   * non-technical, so a lookup problem hides engineering detail rather than
   * exposing it.
   */
  const [resolvedRole, setResolvedRole] = useState({ token: null, role: null });

  const adopt = useCallback(next => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  useEffect(() => {
    const token = session?.accessToken;
    if (!token) return undefined;

    const controller = new AbortController();
    fetchCurrentUserRole(token, controller.signal)
      .then(role => setResolvedRole({ token, role }))
      .catch(() => setResolvedRole({ token, role: null }));

    return () => controller.abort();
  }, [session?.accessToken]);

  const role = resolvedRole.token && resolvedRole.token === session?.accessToken
    ? resolvedRole.role
    : null;

  const refresh = useCallback(() => {
    if (refreshingRef.current) return refreshingRef.current;

    const run = async () => {
      const current = sessionRef.current;
      if (!current) return;

      const rotatedElsewhere = newerStoredSession(current, readStored());
      if (rotatedElsewhere) {
        adopt(rotatedElsewhere);
        return;
      }

      try {
        const next = await refreshOperatorSession(current.refreshToken);
        writeStored(next);
        adopt(next);
      } catch (error) {
        if (!isAuthRejection(error)) {
          setRetryAt(Date.now() + RETRY_DELAY_MS);
          return;
        }

        // Another tab may have used this refresh token a moment ago.
        const rotated = newerStoredSession(current, readStored());
        if (rotated) {
          adopt(rotated);
          return;
        }

        writeStored(null);
        adopt(null);
      }
    };

    refreshingRef.current = run().finally(() => { refreshingRef.current = null; });
    return refreshingRef.current;
  }, [adopt]);

  // Scheduled refresh shortly before the access token lapses, or a retry after
  // a failed attempt, whichever is later.
  useEffect(() => {
    if (!session) return undefined;

    const delay = Math.max(refreshDelay(session), retryAt - Date.now(), 0);
    const timeout = window.setTimeout(refresh, delay);
    return () => window.clearTimeout(timeout);
  }, [session, retryAt, refresh]);

  /*
   * Timers do not run while a laptop sleeps or a phone locks a background tab,
   * so the token can be long expired when the dashboard is looked at again.
   * Refresh as soon as it is, rather than waiting for a timer that fired late.
   */
  useEffect(() => {
    if (!session) return undefined;

    const refreshIfStale = () => {
      if (document.visibilityState === 'visible' && needsRefresh(sessionRef.current)) refresh();
    };

    document.addEventListener('visibilitychange', refreshIfStale);
    window.addEventListener('focus', refreshIfStale);
    window.addEventListener('online', refreshIfStale);
    return () => {
      document.removeEventListener('visibilitychange', refreshIfStale);
      window.removeEventListener('focus', refreshIfStale);
      window.removeEventListener('online', refreshIfStale);
    };
  }, [session, refresh]);

  // Signing in or out in one tab does the same in every other open tab.
  useEffect(() => {
    const handleStorage = event => {
      if (event.key !== SESSION_KEY) return;
      adopt(parseStoredSession(event.newValue));
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [adopt]);

  const login = useCallback(async (email, password) => {
    const nextSession = await signInWithPassword(email, password);
    writeStored(nextSession);
    adopt(nextSession);
  }, [adopt]);

  const logout = useCallback(async () => {
    const accessToken = session?.accessToken;
    writeStored(null);
    adopt(null);

    if (accessToken) {
      await signOut(accessToken).catch(() => undefined);
    }
  }, [adopt, session?.accessToken]);

  return { session, role, login, logout };
}
