export const ACTIVITY_RANGE_LIMIT = 5_000;
export const ACTIVITY_PAGE_SIZE = 100;

// The callback rejects on a failed page. Never present a partial request as complete.
export async function collectActivityPages(fetchPage, signal) {
  const rows = [];
  while (rows.length < ACTIVITY_RANGE_LIMIT) {
    signal?.throwIfAborted();
    const limit = Math.min(ACTIVITY_PAGE_SIZE, ACTIVITY_RANGE_LIMIT - rows.length);
    const page = await fetchPage(limit, rows.length);
    signal?.throwIfAborted();
    if (!Array.isArray(page)) throw new Error('Activity response was not a list.');
    rows.push(...page.slice(0, limit));
    if (page.length < limit) return { rows, capped: false };
  }
  return { rows, capped: true };
}
