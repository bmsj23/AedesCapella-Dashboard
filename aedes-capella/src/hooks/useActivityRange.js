import { useEffect, useState } from 'react';
import { fetchRuntimeActivityRange } from '../lib/supabaseApi';
import { getFriendlyError } from '../utils/userMessages';

export function useActivityRange(accessToken, startIso, endIso) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);
  const enabled = Boolean(accessToken && startIso && endIso);
  const key = JSON.stringify([accessToken, startIso, endIso, revision]);

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    // Historical ranges are fetched once, independently of the shared live
    // dashboard's health polling. Cancel old pages when the selection changes.
    fetchRuntimeActivityRange(accessToken, startIso, endIso, controller.signal)
      .then(data => {
        if (!controller.signal.aborted) setResult({ key, ...data, error: '' });
      })
      .catch(error => {
        if (!controller.signal.aborted) setResult({
          key, rows: [], capped: false,
          error: getFriendlyError(error, 'Activity for this period could not be loaded. Please try again.'),
        });
      });
    return () => controller.abort();
  }, [enabled, accessToken, startIso, endIso, key]);

  // Never flash rows or totals belonging to a previous selection or session.
  const current = result?.key === key ? result : null;
  return {
    rows: current?.rows || [], capped: current?.capped || false,
    error: current?.error || '', loading: enabled && !current,
    refresh: () => setRevision(value => value + 1),
  };
}
