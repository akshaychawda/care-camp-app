# Navigation & Dashboard Redesign — Design Spec

**Date:** 2026-05-31
**Status:** Approved

---

## Problem

The current admin panel has three nav items (Dashboard, New Camp, Users) where the dashboard mixes analytics and camp management into one scrollable page. Navigating between them is not intuitive, and the dashboard doesn't tell a coherent story — it's a list of camps with stats bolted on top.

---

## What We're Building

1. **New nav structure** — 3 items: Overview · Camps · Users. "New Camp" moves inside the Camps page as a button.
2. **Overview page** — pure analytics dashboard with a clear top-to-bottom story.
3. **Camps page** — camp browser with filters and summary cards. Replaces the camp list currently on the dashboard.
4. **Area normalization** — trim + title case area field on save to reduce bad data in charts.

**Not in scope:** Parent directory / outreach planner — captured as a future feature.

---

## Navigation

### Desktop sidebar (unchanged structure, updated items)

```
Overview     → /admin
Camps        → /admin/camps
Users        → /admin/users  (super_admin + mad_employee only)
```

Remove: `New Camp` nav item (moved to Camps page button).

### Mobile bottom tab bar (already exists — just update NAV array)

Same 3 items. Bottom tab bar renders from the same `NAV` constant as the sidebar — no structural change needed.

### Role visibility

| Role         | Overview | Camps | Users |
| ------------ | -------- | ----- | ----- |
| super_admin  | ✅       | ✅    | ✅    |
| mad_employee | ✅       | ✅    | ✅    |
| co           | ✅       | ✅    | ❌    |
| cho          | ✅       | ✅    | ❌    |

---

## Routes

| Route                 | Component                       | Notes                             |
| --------------------- | ------------------------------- | --------------------------------- |
| `/admin`              | `admin.index.tsx`               | Becomes Overview (analytics only) |
| `/admin/camps`        | `admin.camps.tsx`               | New — camp browser                |
| `/admin/new`          | `admin.new.tsx`                 | Unchanged — still the create form |
| `/admin/sessions/:id` | `admin.sessions.$sessionId.tsx` | Unchanged                         |
| `/admin/users`        | `admin.users.tsx`               | Already redesigned                |

---

## Overview Page (`/admin`)

### Layout (top to bottom — follows F-pattern reading order)

**1. Alert strip** (conditional — only shown when ≥1 camp is open)

- Green gradient banner: "X camps are live right now — [city · area list]" + "Go to camp →" button
- Button links to the first active camp's session detail page
- Hidden when no camps are open

**2. Last updated** — "↻ Updated X ago" — timestamp of last data fetch

**3. Filters** (top right, applies to all stats below)

- City dropdown (All cities + each distinct city)
- Owner dropdown (All owners + active COs/mad_employees)
- Time period: Last 30 days · Last 90 days · All time

**4. Section: Reach** — 3 hero tiles (largest visual weight)

| Tile               | Value                            | Sub-text                                        | Highlight                   |
| ------------------ | -------------------------------- | ----------------------------------------------- | --------------------------- |
| Children           | Total registrations              | "Dreams captured"                               | Standard                    |
| Parents Registered | Unique phone numbers             | "unique families reached · ↑ X% vs last period" | **Red border — north star** |
| Card Success Rate  | `cards_generated / total * 100`% | "X of Y generated"                              | Standard                    |

**5. Section: Activity** — 3 medium tiles with icon

| Tile        | Value                      |
| ----------- | -------------------------- |
| Total Camps | Count of all sessions      |
| Active Now  | Count of `is_open = true`  |
| Closed      | Count of `is_open = false` |

**6. Section: Efficiency** — 3 small tiles (closed camps only)

| Tile               | Computation                                                      |
| ------------------ | ---------------------------------------------------------------- |
| Avg Camp Duration  | Mean of `(closed_at - created_at)` in minutes → display as Xh Ym |
| Avg Parents / Camp | `total registrations / closed camp count`                        |
| Avg Cards / Camp   | `total cards generated / closed camp count`                      |

**7. Section: Trends & Breakdown**

**Row 1:** Registrations per week — full-width bar chart, last 12 weeks. X-axis: W1…W12. Each bar = sum of registrations in that calendar week.

**Row 2:** Three charts side by side (3-column grid)

- **Camps by city** — horizontal bar chart. Each row: city name · bar · count. Sorted by count desc. Max 6 cities.
- **Children by gender** — donut chart. Three segments: Girls / Boys / Prefer not to say. Legend with % labels.
- _(third slot empty for now — reserved for future metric)_

### Role-aware data

| Role                       | Data shown                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------- |
| super_admin / mad_employee | All camps + all registrations                                                          |
| co                         | Only sessions where `created_by = me` OR `assigned_to = me` OR in `camp_collaborators` |
| cho                        | Only sessions in `camp_collaborators` for `user_id = me`                               |

---

## Camps Page (`/admin/camps`) — new route

### Layout

**Header:** "Camps" title + "+ New Camp" button (links to `/admin/new`). Button hidden for `cho` role.

**Summary cards** (top, 2 cards)

- Open Now: count of `is_open = true` sessions (green accent border)
- Closed: count of closed sessions

**Filter row**

- Status pills: All · Open · Closed
- City dropdown: All cities + distinct cities
- Owner dropdown: All owners + active COs/employees (super_admin/mad_employee only)

**Result summary line:** "Showing X camps · [status] · [city] · [owner]"

**Camp list** — same card design as current dashboard. Sorted: open first, then by date desc.

Each camp card shows: city · area · venue · date · owner name · registration count · card count · Open/Closed badge.

Click → `/admin/sessions/:id`

**Empty state:** "No camps yet. Create your first camp →" (links to `/admin/new`)

---

## Area Normalization

In `src/lib/api.ts` → `registerParentAndChild()`, normalize the `area` field before inserting:

```typescript
area: params.area.trim().replace(/\b\w/g, (c) => c.toUpperCase()),
```

This handles "koregaon park" → "Koregaon Park" and " baner " → "Baner". Does not fix spelling errors — accepted limitation until a dropdown is introduced post-camp.

---

## API Changes

### New functions needed in `src/lib/api.ts`

**`getOverviewStats(filter)`** — returns:

```typescript
{
  totalCamps: number;
  activeCamps: number;
  closedCamps: number;
  totalRegistrations: number;
  uniqueParents: number; // distinct phone numbers
  cardsGenerated: number;
  avgDurationMinutes: number; // across closed camps
  avgParentsPerCamp: number;
  avgCardsPerCamp: number;
  registrationDeltaPct: number; // vs previous period
}
```

**`getRegistrationsByWeek(weeks: number)`** — returns `{ week: string; count: number }[]` for last N weeks.

**`getCampsByCity()`** — returns `{ city: string; count: number }[]` sorted desc.

**`getChildrenByGender()`** — returns `{ gender: string; count: number }[]`.

**`getLiveCamps()`** — returns open camp sessions with city + area for the alert banner.

### Existing functions to reuse (no change)

- `getSessions()` — reused in Camps page with client-side filter
- `getCampOwners()` — reused for owner dropdown
- `getPendingCount()` — sidebar badge, unchanged

---

## Component Changes

### `src/components/admin/AdminLayout.tsx`

Update `NAV` constant:

```typescript
const NAV = [
  { label: "Overview", to: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Camps", to: "/admin/camps", icon: Tent, exact: false },
  { label: "Users", to: "/admin/users", icon: Users, exact: false },
];
```

Remove `New Camp` entry. Remove `canCreateCamp` filter. Keep `canSeeUsers` filter for Users.

### `src/routes/admin.index.tsx`

Full rewrite — remove camp list, replace with Overview analytics layout as specced above.

### `src/routes/admin.camps.tsx` (new file)

Camp browser — summary cards, filter pills, camp list. Moved from `admin.index.tsx`.

### `src/components/admin/PageGuide.tsx`

- Rename `"dashboard"` key → `"overview"`
- Add `"camps"` key with role-specific content

---

## PageGuide Content — Camps page

| Role                       | Content                                                                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| super_admin / mad_employee | "Browse all camps. Use + New Camp to create one. Open camps are live — click in to see registrations in real time."                          |
| co                         | "Your camps appear here — ones you created or that were shared with you. Create a new camp and share the QR with your CHO before the event." |
| cho                        | "Camps your CO has shared with you. Open the camp on event day and use the fullscreen QR button to show parents."                            |

---

## Empty States

| Page     | State                 | Message                                                  |
| -------- | --------------------- | -------------------------------------------------------- |
| Overview | No camps exist        | "No camps yet. Head to Camps to create your first one →" |
| Overview | No registrations      | Stats show 0 — no special message                        |
| Camps    | No camps              | "No camps yet. Create your first camp →"                 |
| Camps    | No camps match filter | "No camps match these filters." + Clear filters link     |

---

## Out of Scope

- Parent directory / outreach planner (future feature — captured separately)
- Area autocomplete in parent flow (post-camp v2)
- Map-based geographic visualization
- Configurable dashboard widgets
