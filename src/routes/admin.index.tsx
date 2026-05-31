import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Route as AdminRoute } from "@/routes/admin";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
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
    meta: [
      { title: "Overview — MAD Care Camps" },
      { name: "description", content: "Programme health at a glance." },
    ],
  }),
});

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
  const [loadError, setLoadError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(false);
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
    } catch {
      setLoadError(true);
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

  const updatedLabel = updatedAt
    ? `↻ Updated at ${updatedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
    : loadError ? "↻ Failed to load — " : "↻ Loading…";

  return (
    <div className="px-5 md:px-10 py-6 md:py-10 w-full max-w-3xl mx-auto">
      <PageGuide pageKey="overview" role={profile?.role ?? "cho"} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Programme health at a glance</p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap justify-end">
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

      {/* Live banner — only when camps are open */}
      {liveCamps.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
          <p className="text-white text-sm font-semibold min-w-0">
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

      {/* Status row */}
      <div className="flex items-center gap-2 mb-4">
        <p className="text-xs text-muted-foreground flex-1">{updatedLabel}</p>
        {loadError && (
          <button onClick={load} className="text-xs text-primary font-semibold hover:underline">
            Retry
          </button>
        )}
      </div>

      {/* REACH */}
      <SectionLabel>Reach</SectionLabel>
      <div className="grid grid-cols-3 gap-3 mb-3">
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
          <p className="text-xs text-emerald-500 font-semibold mt-2">
            {(parentStats?.cardsGenerated ?? 0)} of {(parentStats?.totalChildren ?? 0)} generated
          </p>
        </div>
      </div>

      {/* ACTIVITY */}
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

      {/* EFFICIENCY */}
      <SectionLabel>Efficiency</SectionLabel>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <p className="text-xl font-black text-foreground">{avgDuration ?? "—"}</p>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Avg Duration</p>
          <p className="text-xs text-muted-foreground mt-1">
            {closedCamps > 0 ? `Across ${closedCamps} closed camp${closedCamps > 1 ? "s" : ""}` : "No closed camps yet"}
          </p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <p className="text-xl font-black text-foreground">{closedCamps > 0 ? avgParentsPerCamp : "—"}</p>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Avg Parents / Camp</p>
          <p className="text-xs text-muted-foreground mt-1">Per closed camp</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <p className="text-xl font-black text-foreground">{closedCamps > 0 ? avgCardsPerCamp : "—"}</p>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-1">Avg Cards / Camp</p>
          <p className="text-xs text-muted-foreground mt-1">Per closed camp</p>
        </div>
      </div>

      {/* TRENDS */}
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
