# Handoff: Latest Activity day and week filter (for Sol)

Date: 20 October 2026
Repo: AedesCapella-Dashboard, branch `feat/role-screens-panel3` (head 2192d0a). Paths below are relative to `aedes-capella/`.
Owner: Benedict San Juan (lead). Defence is 22 October 2026, so keep the change small and safe.

## What the lead wants

Users (midwife, BHWs, admin) want to see the full results for a specific day or a specific week in the Latest Activity table. Right now the only choices are "Today" and "Everything recent", and "Everything recent" is just the newest 100 rows. That is not friendly for looking back at, for example, the UAT days.

## How it works now

- `src/sections/LiveFeed/index.jsx`: `scope` state is `'today'` or `'recent'`. Rows come from `dashboardData.activity`, filtered client-side by `manilaStartOfDay()`. The two buttons are rendered in this file.
- `src/lib/supabaseApi.js`: `fetchRuntimeActivity` reads `dashboard_runtime_activity`, kinds `BOOT,LIVE_ACCEPT,RELAY_ON,RELAY_REJECT`, `order=display_time.desc`, `limit=ACTIVITY_FETCH_LIMIT` (100). This feed is polled every 30 s for the live view.
- `src/sections/LiveFeed/ActivitySummary.jsx`: the counts above the table come from the RPC `dashboard_activity_summary(p_window_hours, p_window_start)`. The section rule is that the counts obey the same filter as the table (see the comment in `index.jsx`).
- `src/sections/LiveFeed/FeedTable.jsx`: the table. Its note says `Showing the N most recent`.
- Display cutoff: `src/utils/displayCutoff.js` and `dashboard_settings.display_from` hide records before UAT (29 Sep 2026, Manila). The new filter must respect it.

Important: the RPC (migration `supabase/migrations/202608290006_activity_summary_calendar_window.sql` in the thesis repo) counts from `window_start` to **now**. It has no end bound, and it clamps the start to the last 90 days. So it **cannot** give correct counts for a past day or week. Do not reuse it for the new filter.

## What to build

1. Replace the two buttons with three choices: **Today** (default, unchanged behaviour), **Pick a day**, and **Pick a week**.
   - Day: a native `<input type="date">`. The window is that day, 00:00 to 24:00 Manila time (UTC+8, no DST).
   - Week: a date input plus a "Week of" label. The window is the Monday to Sunday that contains the chosen day, in Manila time. Show the range in words, for example "Mon 28 Sep to Sun 4 Oct 2026".
   - Min date: the display cutoff date. Max date: today. Previous and next arrows are nice to have.
2. Add a new fetch in `supabaseApi.js`, for example `fetchRuntimeActivityRange(accessToken, startIso, endIso, signal)`:
   - Same columns and kinds as `fetchRuntimeActivity`, plus `display_time=gte.<startIso>&display_time=lt.<endIso>`.
   - Page through with `limit` and `offset` (or a `Range` header) until a page comes back short, so the table holds **every** row in the window, not the newest 100. Put a hard cap (for example 5,000 rows) and show a banner if it is hit.
   - Fetch once when the day or week changes. Do not poll a past window. Keep the live 30 s poll only for Today.
3. Counts above the table for a picked day or week: compute them client-side from the fetched rows, using the same rules the RPC uses (candidates = `temporal_candidate`, sprays = `relay_energized`, unresolved = `time_quality`). Reuse the helpers in `src/utils/dashboardData.js` (`filterOperatorActivity`, `isDetectionCandidate` and the like) so the numbers match the Today view. Label the panel with the chosen day or week, not "Today".
4. Table note: for a picked window, say `Showing all N records for <day or week>` instead of `Showing the N most recent`. The empty state should say "Nothing recorded on <day>" or "in that week".
5. Times: `display_time` is already the time to sort and filter on. Rows with an untrusted clock (`time_quality` unresolved) keep their current "Unavailable" handling. Say in the code comment which window such rows land in (they land by `display_time`, which is the receipt time).

## Roles

The filter is the same for every role (admin, `health_officer`, `sanitary_inspector`). Do not change what each role can see. Role policy lives in `src/utils/viewer.js`.

## Out of scope

- No database or migration changes. No RLS changes.
- Do not touch Spraying History or Activity Summary in this change. The lead may ask for the same filter there later. If so, reuse the same picker component.
- Match strength was just removed from Activity Summary for all roles (commit 2192d0a). Do not bring it back.

## Checks before handing back

- `npm run lint`, `npm test` (88 tests pass now, add tests for the Manila day and week bounds and the paging stop rule), and `npm run build`.
- Unit test edge cases: a day at the Manila midnight boundary (16:00 UTC), a week that spans two months (Mon 28 Sep to Sun 4 Oct 2026), and a picked day before the display cutoff (blocked by the min date).
- In a browser: pick 30 Sep 2026 and confirm Unit 2's 14 sprays between 13:29 and 15:51 all show. Pick the week of 29 Sep (Mon 28 Sep to Sun 4 Oct, which holds the whole UAT) and confirm the totals match the UAT numbers (37 sprays in all).

## Git rules from the lead

- Commit as the lead, with no AI co-author trailer and no "Generated with" line.
- Stage paths explicitly. Push to `feat/role-screens-panel3` only. No PR and no merge to master unless the lead asks.
- Write a short hand-back file in the repo root when done, like `ROLE_SCREENS_HAND_BACK_20261019.md`.
