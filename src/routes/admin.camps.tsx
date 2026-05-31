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
            {s === "all" ? `All${sessions.length > 0 ? ` ${sessions.length}` : ""}` : s}
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
                  <div className="text-right hidden sm:block">
                    <div className="font-bold tabular-nums text-foreground">{s.parent_count}</div>
                    <div className="text-xs text-muted-foreground">Parents</div>
                  </div>
                  <div className="text-right hidden sm:block">
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
