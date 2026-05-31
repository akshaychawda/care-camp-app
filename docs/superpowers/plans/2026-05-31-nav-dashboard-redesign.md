# Navigation & Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current Dashboard (stats + camp list) with three distinct pages — Overview (analytics), Camps (browser), Users (already done) — wired to a 3-item nav on desktop sidebar and mobile bottom tab bar.

**Architecture:** `admin.index.tsx` becomes the Overview analytics page. A new `admin.camps.tsx` file handles camp browsing (moved from admin.index). New API functions compute aggregated stats from Supabase. TanStack Router file-based routing auto-picks up the new file. Recharts (already installed) handles all charts. No new dependencies needed.

**Tech Stack:** React, TypeScript, TanStack Router (file-based), Supabase, Recharts, Tailwind CSS, Lucide icons.

---

## File Map

| File | Change |
|------|--------|
| `src/components/admin/AdminLayout.tsx` | Update NAV array — Overview + Camps + Users |
| `src/components/admin/PageGuide.tsx` | Rename "dashboard"→"overview", add "camps" key |
| `src/lib/api.ts` | Add `getParentStats`, `getRegistrationsByWeek`, `getLiveCamps`; normalize area on save |
| `src/routes/admin.index.tsx` | Full rewrite — Overview analytics page |
| `src/routes/admin.camps.tsx` | New file — Camps browser page |
| `src/lib/admin-data.ts` | Delete — legacy mock data, no longer used |

---

### Task 1: Update AdminLayout NAV and sidebar

**Files:**
- Modify: `src/components/admin/AdminLayout.tsx`

- [ ] **Step 1: Update NAV constant and imports**

In `src/components/admin/AdminLayout.tsx`, replace the import line and NAV constant:

```typescript
import { Outlet, Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Tent, Users, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import madLogo from "@/assets/mad-logo.png";
import { signOut } from "@/lib/auth";
import { getPendingCount } from "@/lib/api";
import { Route } from "@/routes/admin";
import { Toaster } from "@/components/ui/sonner";

const NAV = [
  { label: "Overview", to: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Camps", to: "/admin/camps", icon: Tent, exact: false },
  { label: "Users", to: "/admin/users", icon: Users, exact: false },
];
```

- [ ] **Step 2: Remove the `canCreateCamp` filter from nav**

Find the nav filter block:
```typescript
const nav = NAV.filter((item) => {
  if (item.to === "/admin/users") return canSeeUsers;
  if (item.to === "/admin/new") return canCreateCamp;
  return true;
});
```

Replace with:
```typescript
const nav = NAV.filter((item) => {
  if (item.to === "/admin/users") return canSeeUsers;
  return true;
});
```

Also remove the `canCreateCamp` variable declaration:
```typescript
// DELETE this line:
const canCreateCamp = profile?.role !== "cho";
```

- [ ] **Step 3: Build to confirm no errors**

```bash
cd ~/Projects/care-camp-app && npm run build 2>&1 | tail -5
```

Expected: `✓ built in X.XXs`

- [ ] **Step 4: Commit**

```bash
cd ~/Projects/care-camp-app && git add src/components/admin/AdminLayout.tsx && git commit -m "feat(nav): Overview + Camps + Users — remove New Camp from sidebar"
```

---

### Task 2: Update PageGuide keys

**Files:**
- Modify: `src/components/admin/PageGuide.tsx`

- [ ] **Step 1: Rename "dashboard" key to "overview" and add "camps" key**

In `src/components/admin/PageGuide.tsx`, rename the `dashboard:` key to `overview:` in the `GUIDES` object. Then add a `camps:` key after it:

```typescript
  camps: {
    super_admin: [
      {
        heading: "Browse all camps",
        body: "Every camp across all cities and owners. Use + New Camp to create one. Open camps are live — click in to see registrations in real time.",
      },
      {
        heading: "Filters",
        body: "Filter by Open/Closed, city, or owner. The two cards at the top always show a live count of open and closed camps.",
      },
    ],
    mad_employee: [
      {
        heading: "Browse all camps",
        body: "All camps across all cities. Click + New Camp to create one, then share the QR with your CHO before the event.",
      },
    ],
    co: [
      {
        heading: "Your camps",
        body: "Camps you created or that were shared with you. Create a new camp and share the QR link with your CHO before the event.",
      },
      {
        heading: "On camp day",
        body: "Open the camp session. The fullscreen QR button lets you show the QR directly to parents.",
      },
    ],
    cho: [
      {
        heading: "Camps shared with you",
        body: "Your CO has shared these camps with you. On camp day, open the camp and use the fullscreen QR button to show parents.",
      },
    ],
  },
```

- [ ] **Step 2: Update the "dashboard" reference in admin.index.tsx**

In `src/routes/admin.index.tsx`, find:
```typescript
<PageGuide pageKey="dashboard" role={profile?.role ?? "cho"} />
```

Change to:
```typescript
<PageGuide pageKey="overview" role={profile?.role ?? "cho"} />
```

- [ ] **Step 3: Build check**

```bash
cd ~/Projects/care-camp-app && npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
cd ~/Projects/care-camp-app && git add src/components/admin/PageGuide.tsx src/routes/admin.index.tsx && git commit -m "feat(guide): add camps key, rename dashboard→overview"
```

---

### Task 3: Add new API functions + area normalization

**Files:**
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Add area normalization in `registerParentAndChild`**

Find the area field in the insert inside `registerParentAndChild`:
```typescript
area: params.area,
```

Replace with:
```typescript
area: params.area.trim().replace(/\b\w/g, (c) => c.toUpperCase()),
```

- [ ] **Step 2: Add `getParentStats` function**

Add after `getCampStatus`:

```typescript
export type ParentStats = {
  totalChildren: number;
  uniqueParents: number;
  cardsGenerated: number;
  genderCounts: { gender: string; count: number }[];
};

export async function getParentStats(): Promise<ParentStats> {
  const { data, error } = await supabase
    .from("parent_registrations")
    .select("phone, card_generated, gender");
  if (error) throw error;
  const rows = data ?? [];
  const totalChildren = rows.length;
  const uniqueParents = new Set(rows.map((r) => r.phone)).size;
  const cardsGenerated = rows.filter((r) => r.card_generated).length;
  const genderMap: Record<string, number> = {};
  rows.forEach((r) => {
    const g = r.gender ?? "child";
    genderMap[g] = (genderMap[g] ?? 0) + 1;
  });
  const genderCounts = Object.entries(genderMap).map(([gender, count]) => ({ gender, count }));
  return { totalChildren, uniqueParents, cardsGenerated, genderCounts };
}
```

- [ ] **Step 3: Add `getRegistrationsByWeek` function**

```typescript
export async function getRegistrationsByWeek(weeks = 12): Promise<{ week: string; count: number }[]> {
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);
  const { data, error } = await supabase
    .from("parent_registrations")
    .select("created_at")
    .gte("created_at", since.toISOString());
  if (error) throw error;
  const rows = data ?? [];

  // Build week buckets
  const buckets: Record<string, number> = {};
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const key = `W${weeks - i}`;
    buckets[key] = 0;
  }

  rows.forEach((r) => {
    const created = new Date(r.created_at);
    const msDiff = Date.now() - created.getTime();
    const weeksAgo = Math.floor(msDiff / (7 * 24 * 60 * 60 * 1000));
    if (weeksAgo < weeks) {
      const key = `W${weeks - weeksAgo}`;
      if (buckets[key] !== undefined) buckets[key]++;
    }
  });

  return Object.entries(buckets).map(([week, count]) => ({ week, count }));
}
```

- [ ] **Step 4: Add `getLiveCamps` function**

```typescript
export async function getLiveCamps(): Promise<{ id: string; city: string; area: string }[]> {
  const { data, error } = await supabase
    .from("camp_sessions")
    .select("id, city, area")
    .eq("is_open", true)
    .order("created_at", { ascending: false });
  if (error) return [];
  return data ?? [];
}
```

- [ ] **Step 5: Build check**

```bash
cd ~/Projects/care-camp-app && npm run build 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
cd ~/Projects/care-camp-app && git add src/lib/api.ts && git commit -m "feat(api): getParentStats, getRegistrationsByWeek, getLiveCamps; normalize area on save"
```

---

### Task 4: Create admin.camps.tsx (new Camps browser page)

**Files:**
- Create: `src/routes/admin.camps.tsx`

- [ ] **Step 1: Create the file**

Create `src/routes/admin.camps.tsx` with this content:

```typescript
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus, Loader2 } from "lucide-react";
import { Route as AdminRoute } from "@/routes/admin";
import { getSessions, getCampOwners, type CampSession } from "@/lib/api";
import type { Profile } from "@/lib/supabase";
import { PageGuide } from "@/components/admin/PageGuide";

export const Route = createFileRoute("/admin/camps")({
  component: CampsPage,
  head: () => ({
    meta: [{ title: "Camps — MAD Care Camps" }],
  }),
});

function CampsPage() {
  const { profile } = AdminRoute.useRouteContext();
  const canCreateCamp = profile?.role !== "cho";

  const [sessions, setSessions] = useState<CampSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [owners, setOwners] = useState<Profile[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [s, o] = await Promise.all([getSessions(), getCampOwners()]);
      setSessions(s);
      setOwners(o);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const cities = useMemo(() => Array.from(new Set(sessions.map((s) => s.city))).sort(), [sessions]);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (statusFilter === "open" && !s.is_open) return false;
      if (statusFilter === "closed" && s.is_open) return false;
      if (cityFilter !== "all" && s.city !== cityFilter) return false;
      if (ownerFilter !== "all") {
        const owner = owners.find((o) => o.id === ownerFilter);
        if (s.owner_name !== (owner?.full_name ?? null)) return false;
      }
      return true;
    });
  }, [sessions, statusFilter, cityFilter, ownerFilter, owners]);

  const openCount = useMemo(() => sessions.filter((s) => s.is_open).length, [sessions]);
  const closedCount = useMemo(() => sessions.filter((s) => !s.is_open).length, [sessions]);

  const statusLabel = statusFilter === "all" ? "All statuses" : statusFilter === "open" ? "Open" : "Closed";
  const cityLabel = cityFilter === "all" ? "All cities" : cityFilter;

  return (
    <div className="px-5 md:px-10 py-6 md:py-10 w-full">
      <PageGuide pageKey="camps" role={profile?.role ?? "cho"} />

      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Camps</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse and manage all Care Camp sessions</p>
        </div>
        {canCreateCamp && (
          <Link
            to="/admin/new"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Camp</span>
          </Link>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-card border-2 border-emerald-500/30 rounded-xl p-5">
          <div className="text-3xl font-black text-emerald-500">{openCount}</div>
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Open now</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-3xl font-black text-foreground">{closedCount}</div>
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Closed</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {(["all", "open", "closed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`h-8 px-4 rounded-full border-2 text-xs font-semibold transition capitalize ${
              statusFilter === s
                ? s === "open"
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "bg-foreground border-foreground text-background"
                : s === "open"
                  ? "border-emerald-400 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            }`}
          >
            {s === "all" ? `All ${sessions.length > 0 ? sessions.length : ""}` : s}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="h-8 px-3 rounded-lg border border-border bg-input text-xs font-medium text-foreground"
          >
            <option value="all">All cities</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {owners.length > 0 && (
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="h-8 px-3 rounded-lg border border-border bg-input text-xs font-medium text-foreground"
            >
              <option value="all">All owners</option>
              {owners.map((o) => <option key={o.id} value={o.id}>{o.full_name || o.id.slice(0, 8)}</option>)}
            </select>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Showing <span className="font-semibold text-foreground">{filtered.length} camps</span>
        {" · "}{statusLabel}{" · "}{cityLabel}
      </p>

      {/* Camp list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : loadError ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Failed to load camps.</p>
            <button onClick={load} className="text-sm text-primary font-semibold hover:underline">Try again</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              {sessions.length === 0
                ? profile?.role === "cho"
                  ? "No camps have been shared with you yet."
                  : "No camps yet."
                : "No camps match these filters."}
            </p>
            {sessions.length === 0 && canCreateCamp && (
              <Link to="/admin/new" className="text-sm text-primary font-semibold hover:underline">
                Create your first camp →
              </Link>
            )}
            {sessions.length > 0 && (
              <button
                onClick={() => { setStatusFilter("all"); setCityFilter("all"); setOwnerFilter("all"); }}
                className="text-sm text-primary font-semibold hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((s) => (
              <Link
                key={s.id}
                to="/admin/sessions/$sessionId"
                params={{ sessionId: s.id }}
                className="flex items-center gap-4 px-5 py-4 hover:bg-secondary/30 transition group"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground">
                    {s.city} · {s.area}
                    {s.venue && <span className="text-muted-foreground font-normal"> · {s.venue}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(s.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {s.owner_name && ` · ${s.owner_name}`}
                  </div>
                </div>
                <div className="flex items-center gap-5 shrink-0">
                  <div className="text-right">
                    <div className="font-bold tabular-nums text-foreground">{s.parent_count}</div>
                    <div className="text-xs text-muted-foreground">Parents</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold tabular-nums text-foreground">{s.card_count}</div>
                    <div className="text-xs text-muted-foreground">Cards</div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                    s.is_open ? "bg-emerald-500/15 text-emerald-400" : "bg-secondary text-muted-foreground"
                  }`}>
                    {s.is_open ? "● Open" : "Closed"}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build — TanStack Router will auto-generate the route**

```bash
cd ~/Projects/care-camp-app && npm run build 2>&1 | tail -8
```

Expected: `✓ built in X.XXs` — the router plugin auto-adds the new route to `routeTree.gen.ts`.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/care-camp-app && git add src/routes/admin.camps.tsx && git commit -m "feat: /admin/camps — camp browser with status+city+owner filters"
```

---

### Task 5: Rewrite admin.index.tsx as Overview analytics page

**Files:**
- Modify: `src/routes/admin.index.tsx`

- [ ] **Step 1: Replace the entire file**

Replace the full content of `src/routes/admin.index.tsx`:

```typescript
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Route as AdminRoute } from "@/routes/admin";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  getSessions,
  getCampOwners,
  getParentStats,
  getRegistrationsByWeek,
  getLiveCamps,
  type CampSession,
  type ParentStats,
} from "@/lib/api";
import type { Profile } from "@/lib/supabase";
import { PageGuide } from "@/components/admin/PageGuide";

export const Route = createFileRoute("/admin/")({
  component: Overview,
  head: () => ({
    meta: [{ title: "Overview — MAD Care Camps" }],
  }),
});

const GENDER_COLORS: Record<string, string> = {
  girl: "#C62828",
  boy: "#60a5fa",
  child: "#e5e7eb",
};
const GENDER_LABELS: Record<string, string> = {
  girl: "Girls",
  boy: "Boys",
  child: "Prefer not to say",
};

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mb-2 mt-5 first:mt-0">
      {children}
    </p>
  );
}

function Overview() {
  const { profile } = AdminRoute.useRouteContext();

  const [sessions, setSessions] = useState<CampSession[]>([]);
  const [parentStats, setParentStats] = useState<ParentStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<{ week: string; count: number }[]>([]);
  const [liveCamps, setLiveCamps] = useState<{ id: string; city: string; area: string }[]>([]);
  const [owners, setOwners] = useState<Profile[]>([]);
  const [cityFilter, setCityFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, ps, weekly, live, o] = await Promise.all([
        getSessions(),
        getParentStats(),
        getRegistrationsByWeek(12),
        getLiveCamps(),
        getCampOwners(),
      ]);
      setSessions(s);
      setParentStats(ps);
      setWeeklyData(weekly);
      setLiveCamps(live);
      setOwners(o);
      setUpdatedAt(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const cities = useMemo(() => Array.from(new Set(sessions.map((s) => s.city))).sort(), [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (cityFilter !== "all" && s.city !== cityFilter) return false;
      if (ownerFilter !== "all") {
        const owner = owners.find((o) => o.id === ownerFilter);
        if (s.owner_name !== (owner?.full_name ?? null)) return false;
      }
      return true;
    });
  }, [sessions, cityFilter, ownerFilter, owners]);

  // Stats
  const totalCamps = filteredSessions.length;
  const activeCamps = filteredSessions.filter((s) => s.is_open).length;
  const closedCamps = filteredSessions.filter((s) => !s.is_open).length;

  const avgDuration = useMemo(() => {
    const closed = filteredSessions.filter((s) => s.closed_at);
    if (closed.length === 0) return null;
    const totalMs = closed.reduce((sum, s) =>
      sum + (new Date(s.closed_at!).getTime() - new Date(s.created_at).getTime()), 0);
    const avgMin = Math.round(totalMs / closed.length / 60000);
    const h = Math.floor(avgMin / 60);
    const m = avgMin % 60;
    return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${avgMin}m`;
  }, [filteredSessions]);

  const avgParentsPerCamp = closedCamps > 0
    ? Math.round(filteredSessions.filter(s => !s.is_open).reduce((a, s) => a + s.parent_count, 0) / closedCamps)
    : 0;

  const avgCardsPerCamp = closedCamps > 0
    ? Math.round(filteredSessions.filter(s => !s.is_open).reduce((a, s) => a + s.card_count, 0) / closedCamps)
    : 0;

  const cardSuccessRate = parentStats && parentStats.totalChildren > 0
    ? Math.round((parentStats.cardsGenerated / parentStats.totalChildren) * 100)
    : 0;

  const campsByCity = useMemo(() => {
    const map: Record<string, number> = {};
    filteredSessions.forEach((s) => { map[s.city] = (map[s.city] ?? 0) + 1; });
    return Object.entries(map)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filteredSessions]);

  const genderData = useMemo(() => {
    if (!parentStats) return [];
    return parentStats.genderCounts.map((g) => ({
      name: GENDER_LABELS[g.gender] ?? g.gender,
      value: g.count,
      color: GENDER_COLORS[g.gender] ?? "#888",
    }));
  }, [parentStats]);

  const updatedLabel = updatedAt
    ? `↻ Updated ${Math.round((Date.now() - updatedAt.getTime()) / 1000)}s ago`
    : "↻ Loading…";

  return (
    <div className="px-5 md:px-10 py-6 md:py-10 w-full max-w-6xl">
      <PageGuide pageKey="overview" role={profile?.role ?? "cho"} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Programme health at a glance</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border bg-input text-sm font-medium text-foreground"
          >
            <option value="all">All cities</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {owners.length > 0 && (
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border bg-input text-sm font-medium text-foreground"
            >
              <option value="all">All owners</option>
              {owners.map((o) => <option key={o.id} value={o.id}>{o.full_name || o.id.slice(0, 8)}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Live banner */}
      {liveCamps.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
          <p className="text-white text-sm font-semibold">
            <span className="inline-block w-2 h-2 rounded-full bg-white mr-2 animate-pulse" />
            {liveCamps.length} camp{liveCamps.length > 1 ? "s" : ""} live now —{" "}
            {liveCamps.slice(0, 3).map((c) => `${c.city} · ${c.area}`).join(", ")}
            {liveCamps.length > 3 && ` +${liveCamps.length - 3} more`}
          </p>
          <Link
            to="/admin/sessions/$sessionId"
            params={{ sessionId: liveCamps[0].id }}
            className="shrink-0 bg-white text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 transition"
          >
            Go to camp →
          </Link>
        </div>
      )}

      <p className="text-xs text-muted-foreground mb-4">{updatedLabel}</p>

      {/* LAYER 1: Reach */}
      <SectionLabel>Reach</SectionLabel>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Children</p>
          <p className="text-4xl font-black text-foreground">{(parentStats?.totalChildren ?? 0).toLocaleString("en-IN")}</p>
          <p className="text-xs text-muted-foreground mt-2">Dreams captured</p>
        </div>
        <div className="bg-card border-2 border-primary rounded-xl p-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Parents Registered</p>
          <p className="text-4xl font-black text-primary">{(parentStats?.uniqueParents ?? 0).toLocaleString("en-IN")}</p>
          <p className="text-xs text-muted-foreground mt-2">Unique families reached</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Card Success Rate</p>
          <p className="text-4xl font-black text-foreground">{cardSuccessRate}%</p>
          <p className="text-xs text-emerald-500 font-semibold mt-2">{(parentStats?.cardsGenerated ?? 0)} of {(parentStats?.totalChildren ?? 0)} generated</p>
        </div>
      </div>

      {/* LAYER 2: Activity */}
      <SectionLabel>Activity</SectionLabel>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-secondary/40 border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="text-2xl">🏕️</div>
          <div>
            <p className="text-2xl font-black text-foreground">{totalCamps}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Camps</p>
          </div>
        </div>
        <div className="bg-secondary/40 border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="text-2xl">🟢</div>
          <div>
            <p className="text-2xl font-black text-emerald-500">{activeCamps}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Now</p>
          </div>
        </div>
        <div className="bg-secondary/40 border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="text-2xl">🔒</div>
          <div>
            <p className="text-2xl font-black text-foreground">{closedCamps}</p>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Closed</p>
          </div>
        </div>
      </div>

      {/* LAYER 3: Efficiency */}
      {closedCamps > 0 && (
        <>
          <SectionLabel>Efficiency (closed camps)</SectionLabel>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-card border border-border/50 rounded-xl p-4">
              <p className="text-xl font-black text-foreground">{avgDuration ?? "—"}</p>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Avg Duration</p>
              <p className="text-xs text-muted-foreground mt-1">Across {closedCamps} closed camps</p>
            </div>
            <div className="bg-card border border-border/50 rounded-xl p-4">
              <p className="text-xl font-black text-foreground">{avgParentsPerCamp}</p>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Avg Parents / Camp</p>
            </div>
            <div className="bg-card border border-border/50 rounded-xl p-4">
              <p className="text-xl font-black text-foreground">{avgCardsPerCamp}</p>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Avg Cards / Camp</p>
            </div>
          </div>
        </>
      )}

      {/* LAYER 4: Trends */}
      <SectionLabel>Trends & Breakdown</SectionLabel>
      <div className="bg-card border border-border rounded-xl p-5 mb-3">
        <p className="text-sm font-bold text-foreground mb-4">Registrations per week — last 12 weeks</p>
        {weeklyData.every((d) => d.count === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-8">No registrations yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip formatter={(v: number) => [v, "Registrations"]} />
              <Bar dataKey="count" fill="var(--primary)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Camps by city */}
        {campsByCity.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm font-bold text-foreground mb-4">Camps by city</p>
            <div className="space-y-3">
              {campsByCity.map((c) => (
                <div key={c.city} className="flex items-center gap-3">
                  <span className="text-sm text-foreground w-24 shrink-0 font-medium">{c.city}</span>
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(c.count / (campsByCity[0]?.count ?? 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-muted-foreground w-6 text-right">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gender breakdown */}
        {genderData.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm font-bold text-foreground mb-4">Children by gender</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value: string) => <span style={{ fontSize: 12 }}>{value}</span>}
                />
                <Tooltip formatter={(v: number) => [v, "Children"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-card border border-border rounded-xl px-6 py-4 text-sm font-semibold text-foreground">
            Loading overview…
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build and confirm clean**

```bash
cd ~/Projects/care-camp-app && npm run build 2>&1 | tail -8
```

Expected: `✓ built in X.XXs`

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/care-camp-app && git add src/routes/admin.index.tsx && git commit -m "feat: Overview analytics page — reach, activity, efficiency, trends, breakdown"
```

---

### Task 6: Delete legacy admin-data.ts

**Files:**
- Delete: `src/lib/admin-data.ts`

- [ ] **Step 1: Check nothing imports admin-data.ts**

```bash
cd ~/Projects/care-camp-app && grep -r "admin-data" src/ --include="*.ts" --include="*.tsx"
```

Expected: no output (if any files show, update them to remove the import before deleting).

- [ ] **Step 2: Delete the file**

```bash
cd ~/Projects/care-camp-app && rm src/lib/admin-data.ts
```

- [ ] **Step 3: Build to confirm**

```bash
cd ~/Projects/care-camp-app && npm run build 2>&1 | tail -5
```

Expected: `✓ built in X.XXs`

- [ ] **Step 4: Push everything**

```bash
cd ~/Projects/care-camp-app && git add -A && git commit -m "chore: remove legacy admin-data.ts mock data" && git push origin main
```

Expected: all commits pushed, Vercel deploy triggered.

---

### Task 7: Verify deploy

- [ ] **Step 1: Confirm Vercel deploy completes**

Wait ~2 minutes then open `https://mad-care-camps.vercel.app/admin` and verify:
- Overview page shows stat tiles and charts (or "0" states if no data yet)
- Sidebar shows Overview · Camps · Users
- Clicking Camps → `/admin/camps` shows camp list
- Mobile bottom tab bar shows 3 items
- Live banner appears if any camps are open

- [ ] **Step 2: Check no console errors**

Open browser DevTools → Console. Confirm no red errors.
