# Camp Form Redesign + Dashboard v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the camp form (city combobox + area + venue, drop chapter) and build Dashboard v2 (5 stat tiles, 4 filters, owner column, registrations chart, avg duration, per-camp summary strip).

**Architecture:** Schema migration first (Task 1, manual Supabase SQL), then api.ts types/functions (Tasks 2–3), then UI tasks (Tasks 4–7) which all depend on the updated types. Tasks 2–7 are blocked until Task 1 is complete. No new tables — three column changes on `camp_sessions`.

**Tech Stack:** React 18, TypeScript, TanStack Router, Supabase client, Tailwind CSS, Recharts (already installed). No test framework — verification via `npm run build` (type-check) + browser. Build: `cd ~/Projects/care-camp-app && npm run build`.

---

## File Map

| File | Tasks |
|------|-------|
| Supabase SQL editor (manual) | Task 1 |
| `src/lib/api.ts` | Tasks 2, 3 |
| `src/routes/admin.new.tsx` | Task 4 |
| `src/routes/admin.index.tsx` | Tasks 5, 6 |
| `src/routes/admin.sessions.$sessionId.tsx` | Task 7 |

---

## Task 1: Supabase Schema Migration

**⚠️ MANUAL TASK — must be done before any code tasks.**

**Files:** None (Supabase dashboard SQL editor)

- [ ] **Step 1: Open Supabase SQL editor**

Go to https://supabase.com/dashboard → your project (`etrlbxugodyvexzsyfdk`) → SQL Editor → New query.

- [ ] **Step 2: Run the migration**

```sql
-- Rename chapter to area (existing data preserved)
ALTER TABLE camp_sessions RENAME COLUMN chapter TO area;

-- Add venue (optional text field)
ALTER TABLE camp_sessions ADD COLUMN venue TEXT;

-- Add closed_at (written when camp is toggled closed)
ALTER TABLE camp_sessions ADD COLUMN closed_at TIMESTAMPTZ;
```

- [ ] **Step 3: Verify**

In Supabase Table Editor, open `camp_sessions`. Confirm:
- Column `chapter` no longer exists
- Column `area` exists with existing data (Deccan, Baner, etc. preserved)
- Column `venue` exists (nullable text)
- Column `closed_at` exists (nullable timestamptz)

---

## Task 2: Update api.ts — Types + Core Functions

**Files:**
- Modify: `src/lib/api.ts`

Updates: `CampSession` type, `toSession` helper, `createSession`, `getSessions`, `getSession`, `toggleCampStatus`.

- [ ] **Step 1: Update CampSession type**

Replace the existing `CampSession` type (lines 5–14):

```typescript
export type CampSession = {
  id: string;
  city: string;
  area: string;
  venue: string | null;
  date: string;
  created_at: string;
  closed_at: string | null;
  is_open: boolean;
  parent_count: number;
  card_count: number;
  owner_name: string | null;
};
```

- [ ] **Step 2: Update toSession helper**

Replace the `toSession` function (lines 30–51):

```typescript
function toSession(
  raw: {
    id: string;
    city: string;
    area: string;
    venue: string | null;
    date: string;
    created_at: string;
    closed_at: string | null;
    is_open: boolean;
    profiles?: { full_name: string } | null;
  },
  regs: { card_generated: boolean }[],
): CampSession {
  return {
    id: raw.id,
    city: raw.city,
    area: raw.area,
    venue: raw.venue ?? null,
    date: raw.date,
    created_at: raw.created_at,
    closed_at: raw.closed_at ?? null,
    is_open: raw.is_open,
    parent_count: regs.length,
    card_count: regs.filter((r) => r.card_generated).length,
    owner_name: (raw.profiles as { full_name: string } | null)?.full_name ?? null,
  };
}
```

- [ ] **Step 3: Update createSession**

Replace `createSession` (lines 53–68):

```typescript
export async function createSession(
  city: string,
  area: string,
  venue: string,
  date: string,
): Promise<CampSession> {
  const {
    data: { session: authSession },
  } = await supabase.auth.getSession();
  const { data, error } = await supabase
    .from("camp_sessions")
    .insert({ city, area, venue: venue || null, date, created_by: authSession?.user.id })
    .select("*, profiles!created_by(full_name)")
    .single();
  if (error) throw error;
  return toSession(data, []);
}
```

- [ ] **Step 4: Update getSessions**

Replace `getSessions` (lines 70–78):

```typescript
export async function getSessions(): Promise<CampSession[]> {
  const { data, error } = await supabase
    .from("camp_sessions")
    .select("*, parent_registrations(id, card_generated), profiles!created_by(full_name)")
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((s) => toSession(s, s.parent_registrations ?? []));
}
```

- [ ] **Step 5: Update getSession**

Replace `getSession` (lines 80–92):

```typescript
export async function getSession(
  id: string,
): Promise<{ session: CampSession; registrations: Registration[] }> {
  const { data, error } = await supabase
    .from("camp_sessions")
    .select("*, parent_registrations(*), profiles!created_by(full_name)")
    .eq("id", id)
    .single();
  if (error) throw error;
  const registrations: Registration[] = data.parent_registrations ?? [];
  return { session: toSession(data, registrations), registrations };
}
```

- [ ] **Step 6: Update toggleCampStatus to write closed_at**

Replace `toggleCampStatus` (lines 138–141):

```typescript
export async function toggleCampStatus(id: string, isOpen: boolean): Promise<void> {
  const update: Record<string, unknown> = { is_open: isOpen };
  if (!isOpen) update.closed_at = new Date().toISOString();
  const { error } = await supabase.from("camp_sessions").update(update).eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 7: Build check**

```bash
cd ~/Projects/care-camp-app && npm run build
```
Expected: `✓ built in Xs` — TypeScript will catch any type mismatches.

- [ ] **Step 8: Commit**

```bash
cd ~/Projects/care-camp-app && git add src/lib/api.ts && git commit -m "feat(api): chapter→area rename, venue, closed_at, owner_name in CampSession"
```

---

## Task 3: Add getRegistrationTimeline + getCampOwners to api.ts

**Files:**
- Modify: `src/lib/api.ts` (append to end of file)

Two new exported functions used by the dashboard chart and Assigned To filter.

- [ ] **Step 1: Add getRegistrationTimeline**

Append to the end of `src/lib/api.ts`:

```typescript
// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getRegistrationTimeline(filters: {
  city?: string;
  area?: string;
  isOpen?: boolean;
  ownerId?: string;
}): Promise<{ date: string; count: number }[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from("parent_registrations")
    .select("created_at, camp_sessions!inner(city, area, is_open, created_by)")
    .gte("created_at", thirtyDaysAgo.toISOString());

  if (error) throw error;

  // Apply camp-level filters in JS
  const filtered = (data ?? []).filter((r) => {
    const s = r.camp_sessions as { city: string; area: string; is_open: boolean; created_by: string };
    if (filters.city && s.city !== filters.city) return false;
    if (filters.area && s.area !== filters.area) return false;
    if (filters.isOpen !== undefined && s.is_open !== filters.isOpen) return false;
    if (filters.ownerId && s.created_by !== filters.ownerId) return false;
    return true;
  });

  // Group by date (YYYY-MM-DD)
  const byDate: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    byDate[d.toISOString().slice(0, 10)] = 0;
  }
  for (const r of filtered) {
    const date = r.created_at.slice(0, 10);
    if (date in byDate) byDate[date]++;
  }

  return Object.entries(byDate).map(([date, count]) => ({ date, count }));
}

export async function getCampOwners(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", "active")
    .in("role", ["co", "mad_employee", "super_admin"])
    .order("full_name");
  if (error) throw error;
  return data ?? [];
}
```

- [ ] **Step 2: Build check**

```bash
cd ~/Projects/care-camp-app && npm run build
```
Expected: `✓ built in Xs`.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/care-camp-app && git add src/lib/api.ts && git commit -m "feat(api): add getRegistrationTimeline and getCampOwners"
```

---

## Task 4: Redesign admin.new.tsx — City Combobox + Area + Venue

**Files:**
- Modify: `src/routes/admin.new.tsx`

Replace Chapter field with Area, add Venue (optional), replace city text input with a `<datalist>`-powered combobox. Update form validation, submission, and confirmation page.

- [ ] **Step 1: Add the city list constant and update state**

In `admin.new.tsx`, add the constant before the `NewCamp` function and update the state:

Replace:
```tsx
function NewCamp() {
  const [city, setCity] = useState("");
  const [chapter, setChapter] = useState("");
  const [date, setDate] = useState<Date | undefined>();
```

With:
```tsx
const CITIES = [
  "Ahmedabad", "Bengaluru", "Chandigarh", "Chennai", "Cochin", "Coimbatore",
  "Delhi", "Dehradun", "Goa", "Guntur", "Gwalior", "Hyderabad", "Kolkata",
  "Lucknow", "Mumbai", "Mysore", "Nagpur", "Pune", "Trivandrum", "Vijayawada",
];

function NewCamp() {
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState<Date | undefined>();
```

- [ ] **Step 2: Update submit function**

Replace the `submit` function's guard and `createSession` call:

```tsx
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city || !area || !date) return;
    setSaving(true);
    setError(null);
    try {
      const session = await createSession(city, area, venue, format(date, "yyyy-MM-dd"));
      const link = `${window.location.origin}/?session=${session.id}`;
      setCreated({ session, link });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create session. Please try again.");
    } finally {
      setSaving(false);
    }
  };
```

- [ ] **Step 3: Update onReset in the Confirmation branch**

```tsx
      onReset={() => {
        setCreated(null);
        setCity("");
        setArea("");
        setVenue("");
        setDate(undefined);
      }}
```

- [ ] **Step 4: Replace form fields**

Replace the three form fields (City, Chapter, Date) with the new four fields (City combobox, Area, Venue, Date). Keep the Date picker unchanged:

```tsx
      <form onSubmit={submit} className="bg-card border border-border rounded-xl p-6 space-y-5">
        <FormField label="City">
          <input
            list="city-options"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Select or type a city"
            required
            autoComplete="off"
            className="w-full h-11 px-3 rounded-lg border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <datalist id="city-options">
            {CITIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </FormField>

        <FormField label="Area / Community">
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="e.g. Koregaon Park, Baner"
            required
            className="w-full h-11 px-3 rounded-lg border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </FormField>

        <FormField label="Venue">
          <input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="e.g. ZP School No. 4, Community Hall"
            className="w-full h-11 px-3 rounded-lg border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </FormField>

        {/* Date field unchanged */}
        <FormField label="Date">
          ...existing date picker JSX unchanged...
        </FormField>
```

Keep the Date picker JSX (Popover/Calendar) exactly as it is — only replace the City and Chapter fields above it.

- [ ] **Step 5: Update submit button disabled condition**

```tsx
        <button
          type="submit"
          disabled={!city || !area || !date || saving}
```

- [ ] **Step 6: Update Confirmation component**

In the `Confirmation` function, update the `share` text and the heading:

```tsx
  const share = () => {
    const text = `Join the MAD Care Camp — ${data.session.city}, ${data.session.area}${data.session.venue ? ` (${data.session.venue})` : ""} on ${new Date(data.session.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}: ${data.link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };
```

Replace the `<h1>` in Confirmation:
```tsx
        <h1 className="text-2xl font-bold text-foreground">
          {data.session.city} — {data.session.area}
        </h1>
        {data.session.venue && (
          <p className="text-muted-foreground text-sm mt-0.5">{data.session.venue}</p>
        )}
```

Also update the page subtitle in `NewCamp` function:
```tsx
      <p className="text-sm text-muted-foreground mb-8">Set up a Care Camp for your community.</p>
```

- [ ] **Step 7: Build check**

```bash
cd ~/Projects/care-camp-app && npm run build
```
Expected: `✓ built in Xs`.

- [ ] **Step 8: Commit**

```bash
cd ~/Projects/care-camp-app && git add src/routes/admin.new.tsx && git commit -m "feat: camp form — city combobox, area, venue; drop chapter"
```

---

## Task 5: Dashboard — 5 Stat Tiles + 4 Filters

**Files:**
- Modify: `src/routes/admin.index.tsx`

Update stat tiles from 3 to 5 (Cities + Areas + Camps + Parents + Cards) and add 4 filters (City, Area, Status, Assigned To). Update all `chapter` references to `area`.

- [ ] **Step 1: Update imports**

Replace the import line:
```tsx
import { getSessions, type CampSession } from "@/lib/api";
```
With:
```tsx
import { getSessions, getCampOwners, type CampSession } from "@/lib/api";
import type { Profile } from "@/lib/supabase";
```

Also update the lucide import — remove unused icons if any, the current set (`ArrowRight, Plus, Users, Sparkles, Calendar`) is fine.

- [ ] **Step 2: Update Dashboard state**

In the `Dashboard` function, replace:
```tsx
  const [city, setCity] = useState("all");
  const [chapter, setChapter] = useState("all");
```
With:
```tsx
  const [city, setCity] = useState("all");
  const [area, setArea] = useState("all");
  const [status, setStatus] = useState<"all" | "open" | "closed">("all");
  const [ownerId, setOwnerId] = useState("all");
  const [owners, setOwners] = useState<Profile[]>([]);
```

Add a useEffect to load owners (after the existing `getSessions` useEffect):
```tsx
  useEffect(() => {
    getCampOwners().then(setOwners).catch(() => {});
  }, []);
```

- [ ] **Step 3: Update computed values**

Replace the entire `cities` / `chapters` / `filtered` / `totals` block with:

```tsx
  const cities = useMemo(() => Array.from(new Set(sessions.map((s) => s.city))).sort(), [sessions]);
  const areas = useMemo(
    () =>
      Array.from(
        new Set(sessions.filter((s) => city === "all" || s.city === city).map((s) => s.area)),
      ).sort(),
    [city, sessions],
  );

  const filtered = useMemo(
    () =>
      sessions.filter((s) => {
        if (city !== "all" && s.city !== city) return false;
        if (area !== "all" && s.area !== area) return false;
        if (status === "open" && !s.is_open) return false;
        if (status === "closed" && s.is_open) return false;
        if (ownerId !== "all" && s.owner_name !== owners.find((o) => o.id === ownerId)?.full_name) return false;
        return true;
      }),
    [sessions, city, area, status, ownerId, owners],
  );

  const totals = useMemo(
    () => ({
      cities: new Set(filtered.map((s) => s.city)).size,
      areas: new Set(filtered.map((s) => s.area)).size,
      camps: filtered.length,
      parents: filtered.reduce((a, s) => a + s.parent_count, 0),
      cards: filtered.reduce((a, s) => a + s.card_count, 0),
    }),
    [filtered],
  );
```

Note: The `ownerId` filter matches by `owner_name` since `getSessions` returns `owner_name` not `owner_id`. Update this to filter by comparing owner_name. Actually, a cleaner approach — store ownerId and compare against a lookup. Let me simplify: filter by `s.owner_name === owners.find(o => o.id === ownerId)?.full_name`. This is fine at this scale.

- [ ] **Step 4: Update the stat tiles JSX**

Replace the stat tiles grid. Currently it renders 3 `<Stat>` components. Replace with 5:

```tsx
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <Stat label="Cities" value={totals.cities} icon={Calendar} />
        <Stat label="Areas" value={totals.areas} icon={Calendar} />
        <Stat label="Total Camps" value={totals.camps} icon={Calendar} />
        <Stat label="Parents" value={totals.parents} icon={Users} />
        <Stat label="Dream Cards" value={totals.cards} icon={Sparkles} />
      </div>
```

(The icon choices are illustrative — reuse the same icons already imported.)

- [ ] **Step 5: Replace filters bar**

Find the filters section inside the camps table header (the two `<select>` elements for city and chapter). Replace the entire filter bar content with:

```tsx
          <h2 className="font-semibold text-foreground mr-auto">Camps</h2>
          <select
            value={city}
            onChange={(e) => { setCity(e.target.value); setArea("all"); }}
            className="h-9 px-3 rounded-md border border-border bg-input text-sm font-medium text-foreground"
            aria-label="Filter by city"
          >
            <option value="all">All Cities</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="h-9 px-3 rounded-md border border-border bg-input text-sm font-medium text-foreground"
            aria-label="Filter by area"
          >
            <option value="all">All Areas</option>
            {areas.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "all" | "open" | "closed")}
            className="h-9 px-3 rounded-md border border-border bg-input text-sm font-medium text-foreground"
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
          {owners.length > 0 && (
            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className="h-9 px-3 rounded-md border border-border bg-input text-sm font-medium text-foreground"
              aria-label="Filter by owner"
            >
              <option value="all">All Owners</option>
              {owners.map((o) => <option key={o.id} value={o.id}>{o.full_name || o.id.slice(0, 8)}</option>)}
            </select>
          )}
```

- [ ] **Step 6: Update chapter → area in camp list display**

In both the mobile card view and desktop table, replace all occurrences of `s.chapter` with `s.area`. The camp label `{s.city} — {s.chapter}` becomes `{s.city} — {s.area}`.

In the desktop table, update the "Chapter" column header to "Area" and `s.chapter` to `s.area`.

- [ ] **Step 7: Build check**

```bash
cd ~/Projects/care-camp-app && npm run build
```
Expected: `✓ built in Xs`. Fix any TypeScript errors (likely `totals.camps` vs `totals.length` references if Stat components were wired differently).

- [ ] **Step 8: Commit**

```bash
cd ~/Projects/care-camp-app && git add src/routes/admin.index.tsx && git commit -m "feat(dashboard): 5 stat tiles, 4 filters (city/area/status/owner), chapter→area"
```

---

## Task 6: Dashboard — Owner Column + Registrations Chart + Avg Duration

**Files:**
- Modify: `src/routes/admin.index.tsx`

Add owner name to camp list, registrations-over-time bar chart, and avg duration insight.

- [ ] **Step 1: Add Recharts import**

Add to the imports at the top of `admin.index.tsx`:

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { getRegistrationTimeline } from "@/lib/api";
```

- [ ] **Step 2: Add chart state + data fetching**

In the `Dashboard` component, add state and effect for the chart:

```tsx
  const [timeline, setTimeline] = useState<{ date: string; count: number }[]>([]);
```

Add a useEffect that refetches the timeline whenever filters change:

```tsx
  useEffect(() => {
    const isOpenFilter = status === "all" ? undefined : status === "open";
    const ownerFilter = ownerId === "all" ? undefined : ownerId;
    const cityFilter = city === "all" ? undefined : city;
    const areaFilter = area === "all" ? undefined : area;
    getRegistrationTimeline({
      city: cityFilter,
      area: areaFilter,
      isOpen: isOpenFilter,
      ownerId: ownerFilter,
    })
      .then(setTimeline)
      .catch(() => {});
  }, [city, area, status, ownerId]);
```

- [ ] **Step 3: Add avg duration computation**

Add this memoized value in the `Dashboard` component:

```tsx
  const avgDuration = useMemo(() => {
    const closed = sessions.filter((s) => s.closed_at);
    if (closed.length === 0) return null;
    const totalMs = closed.reduce((sum, s) => {
      return sum + (new Date(s.closed_at!).getTime() - new Date(s.created_at).getTime());
    }, 0);
    const avgMs = totalMs / closed.length;
    const avgMin = Math.round(avgMs / 60000);
    if (avgMin < 60) return { text: `${avgMin}m`, count: closed.length };
    const h = Math.floor(avgMin / 60);
    const m = avgMin % 60;
    return { text: m > 0 ? `${h}h ${m}m` : `${h}h`, count: closed.length };
  }, [sessions]);
```

- [ ] **Step 4: Add avg duration insight JSX**

Add this block between the stat tiles and the camps table, visible only to `mad_admin`/`mad_employee`/`super_admin`:

```tsx
      {avgDuration && (profile?.role === "super_admin" || profile?.role === "mad_employee") && (
        <p className="text-sm text-muted-foreground mb-4">
          Avg camp duration: <span className="font-semibold text-foreground">{avgDuration.text}</span>
          <span className="ml-1">· based on {avgDuration.count} closed camp{avgDuration.count !== 1 ? "s" : ""}</span>
        </p>
      )}
```

- [ ] **Step 5: Add chart JSX**

Add the registrations chart between the avg duration line and the camps table card:

```tsx
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <h2 className="font-semibold text-foreground mb-4">Registrations — last 30 days</h2>
        {timeline.every((d) => d.count === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-8">No registrations in the last 30 days.</p>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={timeline} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickFormatter={(d: string) => {
                  const date = new Date(d + "T00:00:00");
                  return `${date.getDate()}/${date.getMonth() + 1}`;
                }}
                interval={4}
              />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                formatter={(value: number) => [value, "Registrations"]}
                labelFormatter={(label: string) =>
                  new Date(label + "T00:00:00").toLocaleDateString("en-IN", {
                    day: "numeric", month: "short",
                  })
                }
              />
              <Bar dataKey="count" fill="var(--primary)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
```

- [ ] **Step 6: Add owner to mobile camp card**

In the mobile camp card, add the owner name as a small line below the city/area heading:

```tsx
                  <div className="font-semibold text-foreground">
                    {s.city} — {s.area}
                  </div>
                  {s.owner_name && (
                    <div className="text-xs text-muted-foreground mt-0.5">{s.owner_name}</div>
                  )}
```

- [ ] **Step 7: Add owner column to desktop table**

In the desktop table `<thead>`, add after the Area/Chapter column:
```tsx
<th className="text-left font-semibold px-5 py-3">Owner</th>
```

In each desktop `<tr>`, add the matching `<td>`:
```tsx
<td className="px-5 py-3 text-muted-foreground text-sm">{s.owner_name || "—"}</td>
```

- [ ] **Step 8: Build check**

```bash
cd ~/Projects/care-camp-app && npm run build
```
Expected: `✓ built in Xs`. Recharts types may cause minor warnings — fix if errors.

- [ ] **Step 9: Commit**

```bash
cd ~/Projects/care-camp-app && git add src/routes/admin.index.tsx && git commit -m "feat(dashboard): owner column, registrations chart, avg duration insight"
```

---

## Task 7: Update admin.sessions.$sessionId.tsx — Area/Venue + Summary Strip

**Files:**
- Modify: `src/routes/admin.sessions.$sessionId.tsx`

Replace chapter with area throughout, add venue stat block, add per-camp summary strip.

- [ ] **Step 1: Add formatDuration helper**

Add this helper function near the top of the file (before `StatBlock`):

```tsx
function formatDuration(startIso: string, endIso: string | null): string {
  const endMs = endIso ? new Date(endIso).getTime() : Date.now();
  const totalMin = Math.round((endMs - new Date(startIso).getTime()) / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
```

- [ ] **Step 2: Update heading and chapter → area references**

In `SessionDetail`, replace:
```tsx
      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
        {session.city} — {session.chapter} — {dateStr}
      </h1>
```
With:
```tsx
      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
        {session.city} — {session.area} — {dateStr}
      </h1>
```

- [ ] **Step 3: Add per-camp summary strip**

Add this summary strip immediately below the heading and open/close toggle row (before the `<div className="grid">` that contains stats and registrations):

```tsx
      {session.parent_count > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{session.parent_count} parents</span>
          <span>·</span>
          <span>
            <span className="font-semibold text-foreground">
              {Math.round((session.card_count / session.parent_count) * 100)}%
            </span>{" "}
            got cards
          </span>
          <span>·</span>
          <span>
            {session.closed_at ? (
              <>Ran for <span className="font-semibold text-foreground">{formatDuration(session.created_at, session.closed_at)}</span></>
            ) : (
              <>Open for <span className="font-semibold text-foreground">{formatDuration(session.created_at, null)}</span></>
            )}
          </span>
        </div>
      )}
```

- [ ] **Step 4: Update sidebar stat blocks**

Replace the existing stat blocks in the `<aside>`. Add `area` and `venue` (venue only if non-null), remove chapter:

```tsx
          <StatBlock label="Parents Registered" value={session.parent_count} />
          <StatBlock label="Cards Generated" value={session.card_count} />
          <StatBlock label="Date" value={dateStr} />
          <StatBlock label="City" value={session.city} />
          <StatBlock label="Area" value={session.area} />
          {session.venue && <StatBlock label="Venue" value={session.venue} />}
```

- [ ] **Step 5: Build check**

```bash
cd ~/Projects/care-camp-app && npm run build
```
Expected: `✓ built in Xs`.

- [ ] **Step 6: Final commit + push**

```bash
cd ~/Projects/care-camp-app && git add src/routes/admin.sessions.\$sessionId.tsx && git commit -m "feat: area/venue on camp detail, per-camp summary strip (parents, card rate, duration)"
cd ~/Projects/care-camp-app && git push
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|-----------------|------|
| Rename chapter → area in DB | Task 1 ✓ |
| Add venue column | Task 1 ✓ |
| Add closed_at column | Task 1 ✓ |
| CampSession type updated | Task 2 ✓ |
| createSession(city, area, venue, date) | Task 2 ✓ |
| getSessions joins profiles for owner_name | Task 2 ✓ |
| toggleCampStatus writes closed_at | Task 2 ✓ |
| getRegistrationTimeline | Task 3 ✓ |
| getCampOwners | Task 3 ✓ |
| City combobox with 20 cities | Task 4 ✓ |
| Area field (replaces chapter) | Task 4 ✓ |
| Venue field (optional) | Task 4 ✓ |
| Confirmation page updated | Task 4 ✓ |
| 5 stat tiles (cities, areas, camps, parents, cards) | Task 5 ✓ |
| 4 filters (city, area, status, assigned-to) | Task 5 ✓ |
| chapter → area in camp list labels | Task 5 ✓ |
| Owner column mobile + desktop | Task 6 ✓ |
| Registrations chart (last 30 days, filter-responsive) | Task 6 ✓ |
| Avg duration insight (mad_admin only) | Task 6 ✓ |
| Camp heading uses area not chapter | Task 7 ✓ |
| Venue in sidebar (if non-null) | Task 7 ✓ |
| Per-camp summary strip | Task 7 ✓ |
| formatDuration helper | Task 7 ✓ |

**Placeholder scan:** No TBDs. All code blocks are complete.

**Type consistency:**
- `CampSession.area` defined in Task 2, used in Tasks 4, 5, 6, 7 ✓
- `CampSession.venue` defined in Task 2, used in Tasks 4, 7 ✓
- `CampSession.closed_at` defined in Task 2, used in Tasks 6, 7 ✓
- `CampSession.owner_name` defined in Task 2, used in Tasks 5, 6 ✓
- `getRegistrationTimeline` defined in Task 3, used in Task 6 ✓
- `getCampOwners` defined in Task 3, used in Task 5 ✓
- `formatDuration` defined in Task 7, used only in Task 7 ✓

**Ordering check:**
- Task 1 (schema) must precede all code tasks ✓
- Task 2 (api.ts types) must precede Tasks 4–7 ✓
- Task 3 (api.ts new functions) must precede Tasks 5–6 ✓
- Tasks 4, 5, 6, 7 are independent of each other once Tasks 1–3 are done ✓
