# Camp Form Redesign + Dashboard v2 Design

**Date:** 2026-05-30
**Status:** Approved — ready for implementation planning

---

## Overview

Two connected features implemented as one spec because they share the same schema migration (`chapter` → `area`):

1. **Camp form redesign** — replace Chapter with Area + add Venue; city combobox
2. **Dashboard v2 core** — 5 stat tiles, 4 filters, owner name on list, registrations chart, avg duration insight
3. **Per-camp summary** — computed status strip on camp detail page + `closed_at` tracking

**Out of scope (separate specs):**

- Role-differentiated dashboards
- Analytics layer (form timing, trends by area/city breakdown — covered by filters)
- Per-area/per-city charts (filters + chart already handle this)
- Admin-managed city list

---

## Section 1: Camp Form Redesign

### Schema changes

| Change                                                | Details                                                           |
| ----------------------------------------------------- | ----------------------------------------------------------------- |
| Rename `camp_sessions.chapter` → `camp_sessions.area` | Geographic neighborhood/community (e.g. "Koregaon Park", "Baner") |
| Add `camp_sessions.venue` (text, nullable)            | School or community centre name (e.g. "ZP School No. 4")          |

**Data migration:** Existing `chapter` values become `area` values — no data lost. Chapter values were already geographic (Deccan, Baner, etc.) so the mapping is natural.

### New form fields

| Field | Type                              | Validation | Placeholder                      |
| ----- | --------------------------------- | ---------- | -------------------------------- |
| City  | Combobox (predefined + free text) | Required   | "Select or type a city"          |
| Area  | Text input                        | Required   | "e.g. Koregaon Park, Baner"      |
| Venue | Text input                        | Optional   | "e.g. ZP School, Community Hall" |
| Date  | Date picker                       | Required   | Unchanged                        |

**City list (hardcoded, extendable):**
Ahmedabad, Bengaluru, Chandigarh, Chennai, Cochin, Coimbatore, Delhi, Dehradun, Goa, Guntur, Gwalior, Hyderabad, Kolkata, Lucknow, Mumbai, Mysore, Nagpur, Pune, Trivandrum, Vijayawada

Combobox allows free-text entry for cities not in the list. No state → city cascade (added complexity for low frequency need).

### Code changes

**`src/lib/api.ts`:**

- `CampSession` type: replace `chapter: string` with `area: string`, add `venue: string | null`
- `createSession(city, area, venue, date)` — updated signature
- `getSessions()` — select `area` not `chapter`; join `profiles!created_by(full_name)` to get owner name; add `owner_name` to returned type
- `getSession()` — same join, return `area`, `venue`, `owner_name`

**`src/routes/admin.new.tsx`:**

- Replace Chapter `<input>` with Area `<input>`
- Add Venue `<input>` (optional, no `required` attribute)
- Replace City `<input>` with combobox component
- Confirmation page: show City, Area, Venue, Date (drop "City — Chapter" label pattern)

**`src/routes/admin.index.tsx`:**

- Replace all `s.chapter` → `s.area`
- Camp label: "City — Area" throughout
- Add chapter filter → area filter (distinct values dropdown, same pattern as city)

**`src/routes/admin.sessions.$sessionId.tsx`:**

- Replace `session.chapter` → `session.area`
- Add Venue to the stat blocks sidebar (only if non-null)
- Camp heading: "City — Area — Date"

---

## Section 2: Dashboard v2 Core

### Stat tiles — 5 tiles, all filter-responsive

| Tile               | Computation                                        |
| ------------------ | -------------------------------------------------- |
| Cities             | `new Set(filtered.map(s => s.city)).size`          |
| Areas              | `new Set(filtered.map(s => s.area)).size`          |
| Total Camps        | `filtered.length`                                  |
| Parents Registered | `filtered.reduce((a, s) => a + s.parent_count, 0)` |
| Dream Cards        | `filtered.reduce((a, s) => a + s.card_count, 0)`   |

**Grid:** `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`

All five tiles already update when filters change (filter-responsive stats implemented in previous session).

### Filters — flat bar, all chainable

| Filter      | Type     | Values                                             |
| ----------- | -------- | -------------------------------------------------- |
| City        | Dropdown | Distinct cities from all sessions (existing)       |
| Area        | Dropdown | Distinct areas from all sessions                   |
| Status      | Dropdown | All \| Open \| Closed (maps to `is_open`)          |
| Assigned To | Dropdown | Active COs + MAD employees fetched from `profiles` |

All four filters work together. Stats and camp list both respond to every filter change.

**Assigned To filter** queries `profiles` for `status: "active"` and `role in ["co", "mad_employee", "super_admin"]`. Filters sessions where `owner_id === selected user id`.

### Camp list — owner column

**`getSessions()` updated query:**

```typescript
supabase
  .from("camp_sessions")
  .select("*, parent_registrations(id, card_generated), profiles!created_by(full_name)")
  .order("date", { ascending: false });
```

`CampSession` type gains: `owner_name: string | null`

**Mobile card:** owner name shown as a small line below "City — Area"
**Desktop table:** new "Owner" column between Status and Parents

### Avg duration insight

Shown below the stat tiles, mad_admin view only:

> _"Avg camp duration: 2h 14m · based on 12 closed camps"_

Computed from sessions where `closed_at IS NOT NULL`. Only shown if at least 1 closed camp exists with duration data.

### Registrations over time chart

- **Library:** Recharts via `src/components/ui/chart.tsx` (already in codebase)
- **Data:** `parent_registrations.created_at` grouped by day — last 30 days
- **Type:** Bar chart, one bar per day
- **Filter-responsive:** chart re-queries when any dashboard filter changes
- **Empty state:** "No registrations in the last 30 days" when no data

The chart naturally becomes a per-city or per-area view when filters are applied — no separate breakdown charts needed.

**New API function:**

```typescript
export async function getRegistrationTimeline(filters: {
  city?: string;
  area?: string;
  is_open?: boolean;
  owner_id?: string;
}): Promise<{ date: string; count: number }[]>;
```

Queries `parent_registrations` joined through `camp_sessions`, grouped by day, filtered by camp-level filters.

---

## Section 3: Camp Duration + Per-Camp Summary

### Schema addition

| Column                    | Type                  | Behaviour                                                                              |
| ------------------------- | --------------------- | -------------------------------------------------------------------------------------- |
| `camp_sessions.closed_at` | timestamptz, nullable | Set when `is_open` toggled to `false`; updated if camp is closed again after reopening |

**`toggleCampStatus` update:** when setting `is_open: false`, also set `closed_at: new Date().toISOString()`. When setting `is_open: true`, do NOT clear `closed_at` (preserve last close time for history).

### Per-camp summary strip

Displayed at the top of the camp detail page, above the existing stat blocks:

```
47 parents  ·  89% got cards  ·  Open for 2h 14m
```

or when closed:

```
47 parents  ·  78% got cards  ·  Ran for 1h 52m
```

**Computation:**

- Card rate: `Math.round((session.card_count / session.parent_count) * 100)` — hidden if 0 parents
- Duration when open: `now - session.created_at` (approximation — time since camp was created)
- Duration when closed: `session.closed_at - session.created_at`
- Format: "Xh Ym" (e.g. "2h 14m"); under 1 hour shows "Xm"

---

## Self-review

**Placeholder scan:** No TBDs or incomplete sections.

**Internal consistency:**

- `chapter` → `area` rename is consistent across all three files mentioned
- `closed_at` is only written on close (not on open) — correctly handles reopen/close cycles
- Chart is filter-responsive via the same filter state as tiles and list
- `owner_name` comes from a single join in `getSessions()`, not a separate query

**Scope check:** Focused enough for one implementation plan. Schema migrations (area rename, venue add, closed_at add) are all simple column operations. No new tables.

**Ambiguity check:**

- "Avg duration" uses `closed_at - created_at` (camp creation to close), not first registration to close — this is correct since the camp can be open before anyone registers
- Venue is optional — camp detail only shows it if non-null
- Area filter shows distinct values from all sessions (not just filtered) so you can always browse all areas
