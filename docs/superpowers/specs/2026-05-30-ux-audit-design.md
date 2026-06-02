# UX Audit — Care Camps App (All Personas)

**Date:** 2026-05-30  
**Scope:** Full persona walkthrough — mad_admin, co, cho, parent  
**Method:** Code-level audit + scenario simulation  
**Status:** Findings complete — awaiting prioritisation with Akshay

---

## Summary

46 issues found across 4 personas. Organised by severity below. 4 are critical (could silently corrupt data or mislead users). 11 are high impact (directly affect the June 6 camp experience). The rest are medium/low and can be addressed in subsequent sessions.

---

## Persona 1: MAD Admin (super_admin / mad_employee)

### Onboarding

**A1 — Registration form only offers CHO/CO roles** _(medium)_  
`login.tsx` ROLE_LABELS only shows `co` and `cho`. A new MAD employee who lands on the login page and clicks "Request access" will self-register as CHO or CO, confusing the approver. MAD employees should be invited only — but the UI doesn't communicate this. The "First time? Request access" link should clarify: it's for COs and CHOs, not MAD staff.

**A2 — No tracking of pending invites** _(medium)_  
When a super_admin invites a MAD employee via the invite modal, the invite is sent via email but there's no "pending invites" list anywhere. The admin can't see whether the invite was accepted. Invited users never appear in the Pending tab (they're created as `active`), so the admin has no visibility.

**A3 — No approval notification triggers** _(high)_  
When a CO or CHO is approved, there is no outgoing notification. The user is stuck polling — they have to sign out, re-enter email, wait for a magic link, click it, then find out they're approved. This is a significant friction point; users will miss their approval for hours or days.

### Dashboard

**A4 — Stats tiles are not filtered** _(high)_  
When city/chapter filters are applied to the camps list, the three stat tiles (Total Camps Run, Parents Registered, Dream Cards Generated) still reflect the global all-time totals. This is misleading — the numbers don't match the filtered view.  
**Fix:** Compute stats from `filtered` instead of `sessions`.

**A5 — No open/closed indicator on the camp list** _(high)_  
The dashboard camp cards and table rows show city, chapter, date, parents, cards — but NOT the `is_open` status. On camp day, the admin/CO monitoring remotely cannot tell which camps are live without clicking into each one.  
**Fix:** Add a small Open/Closed badge next to the camp name in the list.

**A6 — Desktop table duplicates the City column** _(low)_  
The table has: Camp (city — chapter) | City | Chapter | Date | … The city appears twice. Drop the standalone City and Chapter columns; the Camp column already contains both.

**A7 — No date-relative highlighting ("today's camps")** _(medium)_  
On camp day, it would be immediately useful to see camps happening today highlighted or grouped separately at the top of the list. Currently everything is sorted by date descending with no visual distinction for today.

### Create Camp

**A8 — Date display bug on confirmation screen** _(critical)_  
`admin.new.tsx` Confirmation component uses `new Date(data.session.date).toLocaleDateString(...)` — missing the `+ "T00:00:00"` fix. June 6 will display as June 5 in IST. This is the same bug fixed elsewhere in the session detail but was missed here.  
**Fix:** `new Date(data.session.date + "T00:00:00").toLocaleDateString(...)`

**A9 — City and Chapter are free-text with no autocomplete** _(medium)_  
"Pune" vs "pune" vs "Pūne" create separate filter entries. No autocomplete from existing values means typos become permanent. The city/chapter filter on the dashboard degrades over time.  
**Fix:** Autocomplete from existing session values (or a predefined list).

**A10 — No venue/school field** _(medium — deferred)_  
Care Camps happen at specific schools. The form captures city + chapter but not the venue. After the camp, there's no record of which school it was at. This is a deliberate v1 simplicity choice — noting for v2.

**A11 — No edit or delete after creation** _(medium)_  
Wrong date, wrong chapter — there's no edit flow and no delete. Only workaround is to ignore the incorrect session and create a new one, leaving ghost data.

**A12 — "Create another →" is near-invisible** _(low)_  
The reset button on the confirmation page is styled as a plain text link at the very bottom of the card. It looks like a footnote.

### Camp Detail

**A13 — No live refresh during camp** _(high)_  
The registrations list loads once and never refreshes. An admin or CO monitoring remotely during a live camp can't see new registrations without a full page reload. At a 50-parent event, they're always looking at stale data.  
**Fix:** Auto-refresh every 30s when camp is open, or add a visible refresh button.

**A14 — Child name and aspiration answers not visible in registrations** _(medium)_  
The registrations table shows parent name, phone, area, card status — but not the child's name or any of their answers. The child data is in the DB (`child_name` on registration, `child_answers` table) but never displayed in the admin UI.

**A15 — No export (CSV/download)** _(medium)_  
No way to export the registrations list for follow-up outreach. MAD admin would need to manually transcribe names and phone numbers.

**A16 — SharePanel shows all users, not just relevant city/chapter** _(low-medium)_  
`getShareableUsers()` returns all active COs and CHOs org-wide. With scale, a CO in Pune would see CHOs from all cities in the share dropdown. Should filter by city or chapter affiliation if that data exists.

---

## Persona 2: CO (Chapter Organizer)

### Onboarding

**B1 — No notification when access is approved** _(high — same as A3)_  
COs self-register, are put in pending, and have no way to know when they've been approved without polling.

**B2 — No "check status" button on the pending page** _(medium)_  
The pending page is a dead end — just a clock icon and "A MAD admin will review shortly." No button to re-check status, no link to re-enter, no estimated time. Users are left in the dark.

### Camp Management

**B3 — No visual distinction between "my camps" and "shared with me"** _(medium)_  
The dashboard subtitle says "Your camps and camps shared with you" but the list itself is flat — no visual cue about which camps the CO owns vs which were shared with them.

**B4 — No prompt to share with CHO after creating a camp** _(medium)_  
The intended workflow: CO creates camp → shares with CHO → CHO uses QR on camp day. But after creating a camp, the confirmation page has no "Share with your CHO now" call to action. The share panel is buried in the session detail page — a CO might forget to share before camp day.

**B5 — Open/close requires navigating to detail page** _(medium)_  
On camp day, the CO needs to open the camp quickly. Currently: Dashboard → click camp → find toggle → click. Should be a one-click action from the dashboard.

---

## Persona 3: CHO (Community Health Organizer)

### Onboarding

**C1 — Empty state message is wrong for CHOs** _(critical)_  
When a CHO first logs in with no camps assigned, the dashboard shows: "No camps yet. Create one to get started." — but CHOs can't create camps. This is actively misleading.  
**Fix:** Show a role-aware empty state: "No camps shared with you yet. Ask your CO to share a camp with you."

**C2 — No guidance for CHO between approval and first camp** _(medium)_  
A CHO who just got approved sees one nav item (Dashboard), an empty dashboard with the wrong message, and nothing else to do. There's no onboarding message explaining what to expect.

### Camp Day

**C3 — No fullscreen QR mode for camp day use** _(high)_  
The CHO's primary job on camp day is to show the QR code to parents. The QR on the session detail page is 160px wide, surrounded by admin stats and controls, and needs parents to lean in and squint to scan it. There's no "fullscreen present QR" mode.  
**Fix:** A "Show QR to parents" button that opens a fullscreen overlay with just the QR code (tappable to dismiss). Ideally brightness bumped to max.

**C4 — Single-item bottom nav on mobile looks broken** _(low)_  
CHOs on mobile see one nav item (Dashboard) in the bottom tab bar. A single-tab nav looks like a UI bug. Should either hide the nav entirely for CHOs with one item, or add a useful "Help" or profile item.

---

## Persona 4: Parent (Unauthenticated)

### Entry

**D1 — Invalid session ID silently shows Welcome instead of error** _(critical)_  
In DreamFlow, the catch block in the `useEffect` for `getCampStatus` does `setStep("welcome")` on failure. If someone navigates to `/?session=garbage-id`, Supabase returns a "no rows" error, which falls through to welcome. The parent fills in all the forms, then gets a confusing error at the very last step (`registerParentAndChild` throws).  
**Fix:** Distinguish between "network error" (fall through to welcome) and "session not found" (404 from Supabase `PGRST116`) → show NoSession.

**D2 — Camp-closed screen is a dead end** _(medium)_  
"Registration for this Care Camp is now closed. Thank you for your interest!" — no next step, no contact info, no information about other camps or MAD.

**D3 — City pre-filled from session, but isn't** _(high)_  
The camp session has a `city` field. Every parent at that camp is in that city — but the form asks them to type it. This is redundant and introduces inconsistency. Pre-filling the city from the session (and making it read-only or at least pre-filled) removes friction and ensures data consistency.  
**Fix:** Pass `session.city` to `DreamFlow` and pre-populate the city field. Optionally lock it.

**D4 — Parent must re-enter all details for a second child** _(critical)_  
When a parent has 2 children, they go through "Next Child" → reset → parent registration form. All fields are blank again. They must re-type their name, phone number, city, and area. At a busy camp with a queue behind them, this is a significant friction point.  
**Fix:** On "Next Child" reset, preserve parent info (name, phone, city, area) and only clear child-specific fields (child name, gender, Q1–Q5). The parent form should detect an existing registration and skip to child name directly.

**D5 — No skip option on hard aspiration questions** _(medium)_  
All 5 questions require a non-empty answer before Continue enables. Q3 ("What problem would you like to fix in the world?") and Q4 ("Who is someone you look up to?") are abstract and hard for young children (6–8). Parents get stuck explaining them. A "Skip" or "Not sure" option would reduce queue blockage.

**D6 — Image generation failure is silent** _(high)_  
When image generation times out or fails, the reveal screen shows the static fallback `dreamCard` image with no explanation. Parents seeing a generic image will think it's their child's personalised card — it isn't. The fallback should be honest: "We couldn't create the custom card right now" with a clear message.  
**Fix:** Add an `imageGenFailed` boolean state; when true, show a specific message on the reveal screen.

**D7 — No recovery if parent taps "Next Child" before saving the card** _(high)_  
After the card reveal, the parent has one chance to download before "Next Child" resets `imageUrl` to null. At a busy camp, volunteers rushing the queue may tap "Next Child" before the parent saves. The generated card URL is saved in the DB (`image_url` on `parent_registrations`) but there's no UI to retrieve it after the fact.  
**Fix 1 (MVP):** Add a confirmation dialog before "Next Child" — "Have you saved [Name]'s card?" with "Yes, next child" / "Go back to card."  
**Fix 2 (UX):** On "Next Child" screen, keep a thumbnail of the last card with a download link still visible.

**D8 — Volunteer might rush the parent** _(medium)_  
Related to D7. The "Next Child" screen shows a success state with a prominent "Next Child" button. There's no delay or "make sure [Name] has saved their card" reminder for the volunteer.

**D9 — Area label is confusing alongside City** _(low)_  
"City" and "Neighbourhood / Area" on the same form can confuse parents. If city is pre-filled from the session (D3 fix), only Area remains — simpler.

**D10 — Download doesn't confirm where the file went** _(medium)_  
After tapping "Download Card," there's no feedback — no "saved to Photos" toast. On Android, files go to Downloads, not Photos, which parents don't know to look in.

**D11 — Phone number normalisation on second registration** _(medium — post-camp)_  
If the same parent registers two children, they enter the same phone number twice. Currently two separate registrations are created. There's no deduplication logic for the parent record (upsert was in the PRD but the implementation is a plain insert — phone uniqueness is not enforced). This means a parent could be in the system multiple times.

---

## Cross-Cutting Issues

**E1 — No real-time data anywhere** _(medium)_  
The app has zero real-time updates. The admin dashboard, camp detail registrations list, and user management lists all require manual refresh to see new data. For a live event with concurrent registrations, this is limiting.

**E2 — Error messages are raw Supabase errors** _(medium)_  
When API calls fail (network, RLS, etc.), the caught error is `err.message` from Supabase, which returns messages like `"new row violates row-level security policy"` — not user-friendly. All visible error strings should be sanitised.

**E3 — No toast/notification system** _(medium)_  
Positive actions (approving a user, sharing a camp, removing a collaborator) have no success feedback. The UI just silently updates. Adding toasts would give users confidence that their action worked.

---

## Priority Matrix

### Fix before first camp (June 6) — 5 days left

| ID      | Issue                                        | Where                           | Est.   |
| ------- | -------------------------------------------- | ------------------------------- | ------ |
| **A8**  | Date display bug on new camp confirmation    | `admin.new.tsx`                 | 5 min  |
| **C1**  | Wrong empty state message for CHOs           | `admin.index.tsx`               | 10 min |
| **D1**  | Invalid session shows Welcome, not error     | `DreamFlow.tsx`                 | 20 min |
| **D3**  | City pre-fill from session                   | `DreamFlow.tsx`, `index.tsx`    | 30 min |
| **D4**  | Return parent retains details for 2nd child  | `DreamFlow.tsx`                 | 45 min |
| **A4**  | Stats tiles filtered by current filter       | `admin.index.tsx`               | 20 min |
| **A5**  | Open/closed badge on camp list               | `admin.index.tsx`               | 15 min |
| **A13** | Refresh button on registrations              | `admin.sessions.$sessionId.tsx` | 20 min |
| **D6**  | Silent image gen failure — honest fallback   | `DreamFlow.tsx`                 | 20 min |
| **D7**  | "Next Child" confirmation before losing card | `DreamFlow.tsx`                 | 30 min |
| **C3**  | Fullscreen QR for CHO camp day               | `admin.sessions.$sessionId.tsx` | 30 min |

**Total estimate: ~4 hours**

### High priority — implement soon after camp

| ID        | Issue                                  | Notes                         |
| --------- | -------------------------------------- | ----------------------------- |
| **A3/B1** | Approval notification email            | Needs Brevo template          |
| **D5**    | Skip option on hard questions          | Simple UX change              |
| **A9**    | City/chapter autocomplete              | Prevents filter fragmentation |
| **D10**   | Download confirmation toast            | Needs Sonner setup            |
| **E2**    | Sanitise error messages                | Housekeeping pass             |
| **E3**    | Toast system for positive actions      | Sonner is already installed   |
| **A14**   | Show child name in registrations table | Simple data addition          |
| **B3**    | "My camp" vs "shared" distinction      | Visual only                   |

### Nice to have — post-camp backlog

| ID      | Issue                                           |
| ------- | ----------------------------------------------- |
| **A2**  | Pending invite tracking                         |
| **A11** | Edit/delete camp                                |
| **A15** | CSV export                                      |
| **A7**  | "Today's camps" highlight                       |
| **B2**  | Check status button on pending page             |
| **B4**  | Post-creation CHO share prompt                  |
| **B5**  | Quick open/close from dashboard                 |
| **C4**  | CHO single-item nav fix                         |
| **D2**  | Camp-closed dead end — next steps               |
| **D8**  | Volunteer "have they saved?" reminder           |
| **D11** | Parent deduplication / upsert                   |
| **E1**  | Real-time registrations (Supabase realtime)     |
| **A6**  | Remove duplicate City column from desktop table |

---

## Recommended Implementation Approach

The 11 pre-camp fixes are independent and can be implemented in parallel. Suggested grouping:

**Group 1 — DreamFlow (parent flow):** D1, D3, D4, D6, D7 (~2h)  
**Group 2 — Admin UI:** A4, A5, A8, A13, C1, C3 (~2h)

All changes are frontend-only except D3 (needs to pass city to DreamFlow via the session object from Supabase, which is already fetched in `getCampStatus`).
