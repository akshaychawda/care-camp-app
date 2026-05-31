import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Route as AdminRoute } from "@/routes/admin";
import { Users, Sparkles, Tent, Clock, UserCheck, Radio, TrendingUp } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
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

// Small label used inside tiles — muted, spaced, minimal
function TileLabel({ icon: Icon, children }: { icon: React.ElementType; children: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      <Icon className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
      <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">{children}</span>
    </div>
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

  // When a city/owner filter is active, Reach must reflect it. We can derive
  // children/cards from session aggregates, but unique-parent dedup (by phone)
  // is only available programme-wide via getParentStats. So under a filter we
  // show the filtered registration totals; unfiltered we show the deduped reach.
  const isFiltered = cityFilter !== "all" || ownerFilter !== "all";

  const childrenCount = isFiltered
    ? filteredSessions.reduce((a, s) => a + s.parent_count, 0)
    : (parentStats?.totalChildren ?? 0);

  const cardsCount = isFiltered
    ? filteredSessions.reduce((a, s) => a + s.card_count, 0)
    : (parentStats?.cardsGenerated ?? 0);

  const parentsCount = isFiltered
    ? childrenCount
    : (parentStats?.uniqueParents ?? 0);

  const cardSuccessRate = childrenCount > 0
    ? Math.round((cardsCount / childrenCount) * 100)
    : 0;

  const updatedLabel = updatedAt
    ? `↻ ${updatedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
    : loadError ? "Failed to load" : "Loading…";

  return (
    <div className="px-5 md:px-10 py-6 md:py-10 w-full max-w-4xl mx-auto">
      <PageGuide pageKey="overview" role={profile?.role ?? "cho"} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Overview</h1>
          <p className="text-xs text-muted-foreground/60 mt-1">{updatedLabel}{loadError && <button onClick={load} className="ml-2 text-primary underline">Retry</button>}</p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap justify-end">
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

      {/* Live banner */}
      {liveCamps.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl px-4 py-3 mb-6 flex items-center justify-between gap-3">
          <p className="text-white text-sm font-semibold min-w-0">
            <span className="inline-block w-2 h-2 rounded-full bg-white mr-2 animate-pulse" />
            {liveCamps.length} camp{liveCamps.length > 1 ? "s" : ""} live now —{" "}
            {liveCamps.slice(0, 3).map((c) => `${c.city} · ${c.area}`).join(", ")}
            {liveCamps.length > 3 && ` +${liveCamps.length - 3} more`}
          </p>
          {liveCamps.length === 1 ? (
            <Link
              to="/admin/sessions/$sessionId"
              params={{ sessionId: liveCamps[0].id }}
              className="shrink-0 bg-white text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 transition"
            >
              Go to camp →
            </Link>
          ) : (
            <Link
              to="/admin/camps"
              search={{ status: "open" }}
              className="shrink-0 bg-white text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 transition"
            >
              View all →
            </Link>
          )}
        </div>
      )}

      {/* Row 1 — Reach */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        {/* Children */}
        <div className="bg-secondary/50 rounded-xl p-5">
          <TileLabel icon={Users}>Children</TileLabel>
          <p className="text-4xl font-black text-foreground leading-none">
            {childrenCount.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-muted-foreground mt-2.5">Dreams captured</p>
        </div>

        {/* Parents — primary KPI, subtle tint */}
        <div className="bg-primary/[0.07] rounded-xl p-5">
          <TileLabel icon={Users}>Parents</TileLabel>
          <p className="text-4xl font-black text-primary leading-none">
            {parentsCount.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-muted-foreground mt-2.5">
            {isFiltered ? "Registrations" : "Unique families reached"}
          </p>
        </div>

        {/* Card rate */}
        <div className="bg-secondary/50 rounded-xl p-5">
          <TileLabel icon={Sparkles}>Card rate</TileLabel>
          <p className="text-4xl font-black text-foreground leading-none">{cardSuccessRate}%</p>
          <p className="text-xs text-emerald-500 font-medium mt-2.5 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {cardsCount} of {childrenCount}
          </p>
        </div>
      </div>

      {/* Row 2 — Ops */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {/* Camps */}
        <div className="bg-secondary/50 rounded-xl p-5">
          <TileLabel icon={Tent}>Camps</TileLabel>
          <p className="text-4xl font-black text-foreground leading-none">{totalCamps}</p>
          <div className="flex items-center gap-2.5 mt-2.5">
            {activeCamps > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                <Radio className="h-2.5 w-2.5" />{activeCamps} live
              </span>
            )}
            <span className="text-xs text-muted-foreground">{closedCamps} closed</span>
          </div>
        </div>

        {/* Avg duration */}
        <div className="bg-secondary/50 rounded-xl p-5">
          <TileLabel icon={Clock}>Avg duration</TileLabel>
          <p className="text-4xl font-black text-foreground leading-none">{avgDuration ?? "—"}</p>
          <p className="text-xs text-muted-foreground mt-2.5">
            {closedCamps > 0 ? `Across ${closedCamps} camps` : "No closed camps yet"}
          </p>
        </div>

        {/* Avg turnout */}
        <div className="bg-secondary/50 rounded-xl p-5">
          <TileLabel icon={UserCheck}>Avg turnout</TileLabel>
          <p className="text-4xl font-black text-foreground leading-none">
            {closedCamps > 0 ? avgParentsPerCamp : "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-2.5">Parents per camp</p>
        </div>
      </div>

      {/* Chart — smooth area line */}
      <div className="bg-secondary/50 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-foreground">Registrations</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Last 12 weeks</span>
            {(parentStats?.totalChildren ?? 0) > 0 && (
              <span className="text-xs font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">
                {(parentStats?.totalChildren ?? 0).toLocaleString("en-IN")} total
              </span>
            )}
          </div>
        </div>
        {weeklyData.every((d) => d.count === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-8">No registrations yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={weeklyData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="regGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="week"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [v, "Registrations"]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#regGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {loading && (
        <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-card border border-border rounded-xl px-6 py-4 text-sm font-semibold text-foreground">
            Loading…
          </div>
        </div>
      )}
    </div>
  );
}
