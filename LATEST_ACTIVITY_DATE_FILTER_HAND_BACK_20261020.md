# Latest Activity date filter hand-back

Implemented on `feat/role-screens-panel3`. Before committing, pulled origin to `73f2138` and restored the date-filter changes without conflicts. Lint, all 98 tests, and the production build were rerun after the pull.

## Behavior

- Latest Activity defaults to Today and retains its existing live data and database counts.
- Pick a day uses Manila midnight bounds. Pick a week uses the Monday through Sunday containing the chosen date and shows the calendar range.
- The native date field blocks dates before the resolved display cutoff and after today. Application validation also blocks invalid or unavailable dates.
- Queries use inclusive start and exclusive end bounds on `display_time`, the same columns and event kinds as the existing feed, and a deterministic timestamp plus event ID sort.
- Historical results page in batches of 100 until a short page, up to 5,000 records. A cap banner and partial-count label prevent incomplete results being described as complete.
- Historical counts use `buildRuntimeSummary`, including the existing candidate exclusions, relay flags, and unresolved-time rules. The open-ended summary RPC is used only for Today.
- Historical windows fetch when their bounds or session change, or on manual Refresh. They do not poll. Shared device-health and live-dashboard polling continues independently.
- Selection changes cancel old requests and immediately hide old rows and counts. Errors allow a manual retry without presenting partial pages as complete results.
- The first available week retains its full Monday-to-Sunday label but clips the query to the display cutoff and explains that restriction. A cutoff within a day is respected too.
- Unresolved clocks belong to the `display_time` receipt window and retain their existing unavailable happened-at presentation.
- Table notes and empty states describe the selected day or week. Existing show-more controls expose all loaded rows.

Roles and permissions, Spraying History, the separate Activity Summary section, database schema, and RLS are unchanged.

## Validation

- `rtk proxy npm run lint`: passed.
- `rtk proxy npm test`: 98 tests passed, including 10 new tests for Manila bounds, the cross-month UAT week, cutoff enforcement, historical count rules, short and exact pages, cap handling, errors, and cancellation.
- `rtk proxy npm run build`: passed with the existing large-chunk warning.
- API integration check through Vite's module loader with mocked fetch: passed. Verified the actual range function's columns, kinds, exclusive end and inclusive start query parameters, deterministic order, access token and abort signal forwarding, three-page collection of 237 records, and invalid-range rejection. No live API requests were sent.
- `git diff --check`: passed.
- Browser verification could not run. The connected browser inventory was empty, and opening the in-app browser returned `Browser is not available: iab`.

## Remaining live acceptance check

Run the dashboard and sign in with an existing account. In Latest Activity, pick 30 September 2026 and verify Unit 2's 14 sprays between 13:29 and 15:51. Pick the week containing 29 September and verify the 37 UAT sprays. These live totals have not been independently verified in this session. Check the picker and table on desktop and mobile, then return to Today and confirm live updates continue.

The lead authorized committing as Benedict San Juan with message `Latest Activity day and week filter.` and pushing only to `origin/feat/role-screens-panel3`. No PR or merge to master is included.

## Documentation consulted

- [React useEffect and fetch cleanup](https://react.dev/reference/react/useEffect)
- [PostgREST pagination](https://docs.postgrest.org/en/stable/references/api/pagination_count.html)
- [Native date input values and min/max validation](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/date)
