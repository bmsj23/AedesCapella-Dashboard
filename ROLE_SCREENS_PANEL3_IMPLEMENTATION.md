# Dashboard roles and Panelist 3 implementation

Branch: feat/role-screens-panel3
Repository: AedesCapella-Dashboard (nested repository, not the parent thestwo repository).
Changes are local and uncommitted. Nothing was pushed or deployed.

## Role behavior

| Database role | Name shown | Sections | Detail and writes |
| --- | --- | --- | --- |
| admin | Administrator | Latest Activity, Barangay Map, Spraying History, Device Status, Activity Summary | Existing technical fields and Device Manager |
| health_officer | Barangay Midwife | All five existing sections | Plain words, score labels, no Device Manager |
| sanitary_inspector | Barangay Health Worker | Latest Activity, Barangay Map, Device Status | Field view with Needs attention first, no technical detail |
| technical_personnel | Technical Personnel | All five | Existing technical behavior retained |
| Unknown or unavailable | Barangay Health Worker | Same three field sections | Least privilege |

Menu items, number shortcuts, hash changes and rendered saved selections use the role mapping. UI gates do not replace RLS. No enum, migration or RLS changes were made. Maintenance and Profile do not exist in this checkout, so no new sections were invented.

## Panelist changes

- Needs attention precedes the activity summary and table. High risk is sorted before Watch using the same complete seven-day counts and existing thresholds as the map. Unmapped devices are included. The empty message is exactly: No device needs attention right now. Failed data sources show incomplete-data guidance instead of reassurance.
- Last detection is explicitly described as the latest in loaded history. An unresolved event time is described as unknown, with its receipt time separately labeled. The candidate list is capped, so it is not claimed to be a complete history.
- Detection rows and attention cards share risk actions. Cooldown observations remain excluded from new detections.
- Red means High risk, faults or spray actions. Amber means Watch, connecting or waiting. Green means normal or online. Grey means offline, unknown or neutral information. The legend explains that a spray record does not establish High risk. Activity tags and chart colors use this palette.
- Score labels preserve the existing display bands: below 60 percent Weak match, 60 to below 80 Possible match, 80 to below 90 Strong match, and 90 to 100 Very strong match. These bands do not change the 0.35 firmware cutoff. Technical views show numbers with labels. Plain views show labels. Missing and invalid scores remain unknown.
- Device agreement is labeled as pairing between devices, separate from a sound score. Plain views show matching pairs instead of a percentage.
- Each spray row explains the available evidence. The saved data does not contain all five sound checks, so no row asserts that a particular activation was caused by exactly 3 of 5 matches. The general 3-of-5 rule, 5-second pulse and 120-second wait are explained separately.
- Helpful Words and reusable hover, focus and tap explanations cover Aedes score, bag, cooldown, relay and offline. Mono now forwards its title prop, restoring existing timestamp explanations as well.
- Empty charts, spraying history, unmapped devices and offline-device sections provide next steps. Existing Latest Activity, Device Status and map empty guidance is retained.
- The risk legend is the first content inside the map card, above its heading and map, in shared desktop and mobile markup.

## Changed files

Paths below are relative to aedes-capella/.

| File | Change |
| --- | --- |
| src/App.jsx | Gate section navigation and rendering by role |
| src/utils/viewer.js | Role names, allowed sections and safe section fallback |
| src/utils/viewer.test.js | Role mapping and forbidden saved/hash section coverage |
| src/components/layout/Sidebar.jsx | Filter navigation and use shared device status colors |
| src/components/layout/Topbar.jsx | Signed-in role label |
| src/components/layout/MobileChrome.jsx | Role name in the visible phone bar |
| src/sections/LiveFeed/NeedsAttention.jsx | Prioritized attention panel, timestamps, loading/error/empty guidance |
| src/sections/LiveFeed/index.jsx | Put attention first and pass device context to rows |
| src/sections/LiveFeed/FeedTable.jsx | Per-risk action, match context and spray evidence lines |
| src/utils/activityGuidance.js | Shared attention ordering, actions, score text and spray explanations |
| src/utils/activityGuidance.test.js | Attention totals, ordering, missing scores, score boundaries and evidence limits |
| src/utils/dashboardData.js | Four-color event presentation, shared score bands, safe missing-score handling |
| src/utils/dashboardData.test.js | Updated band labels and score boundary checks |
| src/components/ui/PaletteGuide.jsx | Four-color meanings and spray caveat |
| src/components/ui/Glossary.jsx | Required technical words and general firmware rule |
| src/components/ui/TechnicalTerm.jsx | Reusable hover/focus/tap explanations |
| src/components/ui/Tag.jsx | Four-color tags and technical explanations |
| src/components/ui/Mono.jsx | Forward title and explain technical text |
| src/components/ui/TablePlate.jsx | Explain technical column labels |
| src/index.css | Role strip, attention cards and responsive tooltip styles |
| src/sections/FoggingLog/FogTable.jsx | Plain match labels, technical labeled scores, reason lines and empty next step |
| src/sections/FoggingLog/HourlyFogChart.jsx | Red spray activation bars |
| src/sections/FoggingLog/index.jsx | Explain general spray rule separately from row evidence |
| src/sections/NodeManagement/index.jsx | No-online-devices guidance |
| src/utils/deviceStatus.js | Unknown state grey and power/Wi-Fi guidance |
| src/sections/RiskMap/RealtimeDeviceMap.jsx | Legend first, empty next step and shared amber hue |
| src/sections/RiskMap/MapLibreDeviceMap.jsx | Shared amber hue |
| src/sections/TrendsAnalytics/DetectionTrendChart.jsx | Consistent chart colors and empty next step |
| src/sections/TrendsAnalytics/DeviceComparison.jsx | Consistent bars, paired-detection context, plain matching-pair count and setup guidance |
| src/sections/TrendsAnalytics/DistributionCharts.jsx | Plain versus technical band labels, consistent bars and empty next steps |
| src/sections/TrendsAnalytics/MetricCards.jsx | Label beside average score and explanation |

## Validation

- rtk proxy npm.cmd test: 88 tests passed, 0 failed.
- rtk proxy npm.cmd run lint: passed.
- rtk proxy npm.cmd run build: passed. Vite still warns about large map/chart chunks.
- rtk proxy npm.cmd run dev -- --host 127.0.0.1: started successfully. Port 5173 was occupied, so this check used 5174.
- Rendered component checks through Vite SSR passed for admin, health_officer, sanitary_inspector and unknown roles: navigation visibility, role label, one attention panel, attention empty state, plain versus technical spray score and honest trigger caveat.
- Browser visual QA and screenshots could not run: no browser surfaces were available, and creating an in-app browser returned Browser is not available: iab. SSR checks verify output but do not verify CSS layout or browser interaction.

Before the defense, sign in with each demo account on desktop and phone. Check menu visibility, forbidden #trends/#fog fallback for BHW, risk legend placement, attention ordering, tooltips by keyboard/tap, map rendering and absence of horizontal clipping. Check Device Manager only appears for technical users. No live-account or deployment verification was performed.

## Demo accounts for the lead

The actual application table is public.app_users. Authentication users are in auth.users. The existing creation trigger creates an app_users row with role health_officer by default.

1. Open the Supabase dashboard for project bmeyddnwnmumjdlzpsny.
2. Open Authentication > Users > Add user > Create new user. Create three separate email/password accounts using emails you control and private passwords. Confirm the emails using the dashboard option if available, or complete confirmation before the demo. Keep passwords outside the repository.
3. Copy each new user's UUID from Authentication > Users.
4. Open Table Editor, schema public, table app_users. Find the row whose id matches that exact UUID. Set full_name for readability and leave is_active true. Set role to admin for the Administrator, health_officer for the Barangay Midwife, and sanitary_inspector for the Barangay Health Worker. Save each row. Do not set a role only in user metadata, because current_user_role() reads app_users.
5. If the matching application row is missing, insert it with id equal to that Auth UUID, full_name set, the appropriate role and is_active true. The schema requires id and full_name. An assigned_location_id may be left null for the all-area demo unless your deployed data policy needs an assignment.
6. Log out before signing in with the next account so the role is fetched again. Confirm the visible name and section list against the table above. This repository's seed and trigger were inspected, but the live project was not changed or inspected.

Official references read: [React conditional rendering](https://react.dev/learn/conditional-rendering), [Vite guide](https://vite.dev/guide/), [Supabase user management](https://supabase.com/docs/guides/auth/managing-user-data), [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords).

## Manuscript and remaining work

Review Figures 9 to 14 for retaking. Every dashboard screenshot containing the shared top bar changes because it now identifies the role. Latest Activity changes most because of the attention panel, action lines and palette. Spraying History, Device Status, Activity Summary and map legend placement also change. Match each existing caption to the relevant screen before replacing it. Manuscript files were not edited.

Still for the lead: create the three accounts, run live browser checks and retake screenshots. A per-activation claim about exactly 3 matching checks out of 5 remains unavailable without corresponding evidence in the saved data. Maintenance/Profile were absent. No commit, push, PR or deployment was requested or performed.

Development-server cleanup: taskkill returned Access denied. The RTK parent was sent a termination signal, but the child Vite server on port 5174 may remain running. The pre-existing server on port 5173 was left alone.
