# Dashboard role screens and Panelist 3 implementation

Date: 19 October 2026
Branch: feat/role-screens-panel3
Baseline: 50eb22e
Repository: AedesCapella-Dashboard (separate from the parent thesis repository)

## Role views

| Signed-in role | Visible sections | Detail |
| --- | --- | --- |
| Administrator (admin) | Latest Activity, Barangay Map, Spraying History, Device Status, Activity Summary | Technical fields and existing Device Manager |
| Barangay Midwife (health_officer) | All five sections | Plain language, score labels without numbers, no Device Manager |
| Barangay Health Worker (sanitary_inspector) | Latest Activity, Barangay Map, Device Status | Field actions and attention list first, no history or trends |
| Technical Personnel (technical_personnel) | All five sections | Existing technical behavior retained |
| Unknown or unavailable role | Same sections as BHW | No technical detail |

The top bar identifies the role on desktop and mobile. Sidebar links, keyboard shortcuts, URL hashes, and saved-section rendering use the same role policy. UI gating is not an access-control replacement. Database roles, RLS, and migrations are unchanged.

Maintenance and Profile sections mentioned in the original handoff do not exist in this checkout. No new sections were invented. Existing diagnostics and registration stay in Device Status for technical roles.

## Changes by file

Paths below are relative to aedes-capella/.

| File | Change |
| --- | --- |
| src/App.jsx | Applies role policy to navigation and rendered sections, with safe fallback |
| src/utils/viewer.js | Role names, section mapping, and safe section resolver |
| src/utils/viewer.test.js | Admin, midwife, BHW, unknown-role, and restricted-section checks |
| src/components/layout/Sidebar.jsx | Filters navigation by role |
| src/components/layout/Topbar.jsx | Signed-in role label |
| src/components/layout/MobileChrome.jsx | Role label remains visible with the mobile menu closed |
| src/sections/LiveFeed/NeedsAttention.jsx | High risk before Watch, actions, last loaded detection time, loading and incomplete-data states |
| src/sections/LiveFeed/index.jsx | Attention panel before activity summary and table |
| src/sections/LiveFeed/FeedTable.jsx | Detection actions, contextual score labels, evidence-aware spray reasons |
| src/utils/activityGuidance.js | Attention sorting, row actions, score formatting, spray explanations |
| src/utils/activityGuidance.test.js | Risk precedence, timestamps, missing scores, score bands, and evidence wording |
| src/utils/dashboardData.js | Four-color event presentation, shared existing score bands, missing-score handling |
| src/utils/dashboardData.test.js | Score-band distribution expectations and cautious language checks |
| src/sections/FoggingLog/FogTable.jsx | Score labels for plain viewers, numbers plus labels for technical viewers, spray reasons and empty-state guidance |
| src/sections/FoggingLog/index.jsx | Explains the configured 3-of-5 rule, 5 second pulse, and 120 second wait separately from saved evidence |
| src/sections/FoggingLog/HourlyFogChart.jsx | Shared spray color |
| src/sections/NodeManagement/index.jsx | No-devices-online next step |
| src/utils/deviceStatus.js | Shared status colors |
| src/sections/RiskMap/RealtimeDeviceMap.jsx | Preserves legend above map, popup actions, actionable unmapped-device state |
| src/sections/RiskMap/MapLibreDeviceMap.jsx | Popup action guidance |
| src/sections/TrendsAnalytics/DistributionCharts.jsx | Named score bands, technical numbers only, consistent chart colors, next steps |
| src/sections/TrendsAnalytics/MetricCards.jsx | Average score with contextual label and technical explanation |
| src/sections/TrendsAnalytics/DeviceComparison.jsx | Describes agreement percentage and uses shared colors |
| src/sections/TrendsAnalytics/DetectionTrendChart.jsx | Shared chart colors and empty-state guidance |
| src/components/ui/PaletteGuide.jsx | Red, amber, green, and grey meanings in one legend |
| src/components/ui/TechnicalTerm.jsx | Focusable, clickable explanations for Aedes score, bag, cooldown, relay, and offline |
| src/components/ui/Tag.jsx | Normalizes legacy tones to the four-color palette and includes technical explanations |
| src/components/ui/Mono.jsx | Technical explanations and forwards timestamp titles |
| src/components/ui/TablePlate.jsx | Technical-label explanations in table headings |
| src/components/ui/Glossary.jsx | Adds the requested technical terms |
| src/index.css | Role strip, attention hierarchy, responsive text, and technical explanation styling |

## Evidence and interpretation

The existing display boundaries are 60, 80, and 90 percent. Labels are Weak match, Possible match, Strong match, and Very strong match. These bands describe a model score, not the probability of a mosquito being present. They do not change the firmware cutoff of 0.35.

Saved spray records do not include all five sound-check results. Rows explain the recorded activation or refusal and explicitly leave the exact trigger unconfirmed. The configured policy is explained separately. The dashboard does not claim fluid delivery.

Attention uses seven-day device totals, including devices without coordinates. The map total is preferred when present, with Device Status as fallback. Detection timestamps are described as the latest in loaded history because the candidate fetch is capped. Unresolved timestamps show receipt information rather than claiming an occurrence time.

## Validation

- rtk proxy npm run lint: passed.
- rtk proxy npm test: 88 tests passed, zero failed.
- rtk proxy npm run build: passed. Vite reports a map chunk larger than 500 kB.
- rtk proxy git diff --check: passed.
- Development server started successfully for local review.
- Browser and screenshot verification could not run: computer-use inventory returned no browsers, and creating an in-app browser returned 'Browser is not available: iab'. Role descriptions above are based on source and tests, not screenshots.
- Live demo-account sign-in and RLS behavior were not exercised. No production changes, commits, pushes, PRs, or deployments were performed.

## Create the three demo accounts

Use the Supabase dashboard for project bmeyddnwnmumjdlzpsny. Keep passwords outside the repository.

1. Open Authentication, then Users. Use Add user / Create new user for each of the three demo identities with an email and password controlled by the lead. Confirm the email if the dashboard offers that option and no email-link step is wanted for the demo.
2. Copy each newly created user's Auth UUID.
3. Open Table Editor, public.app_users. This is the role table in the repository schema, despite the original handoff calling it the users table. The auth trigger normally inserts the profile automatically.
4. Find the row whose id equals the Auth UUID. Set full_name to the chosen display name, is_active to true, and role as shown below. If the profile row is missing, insert it with that same Auth UUID, full_name, role, and is_active. Leave assigned_location_id empty for the all-area demo unless a real approved assignment is required.
5. Set the administrator to admin, the midwife to health_officer, and the BHW to sanitary_inspector. Do not create new enum values.
6. Sign out and sign in separately as each account. Confirm the top-bar name and section visibility against the table above. Existing sessions fetch their role at sign-in, so re-sign in after changing a role.
7. For BHW, try #trends and keyboard shortcut 5. Activity Summary must stay hidden and a forbidden direct section must fall back to Latest Activity. For the midwife, Device Status must omit device registration and raw boot fields. For the administrator, the existing Device Manager must be present.

Official references read: [React conditional rendering](https://react.dev/learn/conditional-rendering), [React useId](https://react.dev/reference/react/useId), [Vite CLI](https://vite.dev/guide/cli.html), and [Supabase user management](https://supabase.com/docs/guides/auth/managing-user-data).

## Figure refresh

Compare Figures 9 through 14 with the new role-specific screens before submission. Latest Activity changes substantially because Needs attention is first. Spraying History changes because score labels and evidence explanations were added. Device Status changes when all devices are offline and differs by role. Activity Summary changes score labels and chart colors. The Barangay Map keeps its legend above the map and adds popup actions. All dashboard screenshots containing the top bar now include the role name. Retake the affected figures using the intended account after browser verification.
