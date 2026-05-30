import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus, Users, Sparkles, Calendar } from "lucide-react";
import { Route as AdminRoute } from "@/routes/admin";
import { getSessions, getCampOwners, type CampSession } from "@/lib/api";
import type { Profile } from "@/lib/supabase";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Care Camps Dashboard — MAD Admin" },
      { name: "description", content: "Internal dashboard for MAD coordinators." },
    ],
  }),
});

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center">
          <Icon className="h-4 w-4 text-accent-foreground" />
        </div>
      </div>
      <div className="text-3xl font-bold tabular-nums text-foreground">
        {value.toLocaleString("en-IN")}
      </div>
    </div>
  );
}

function Dashboard() {
  const { profile } = AdminRoute.useRouteContext();
  const canCreateCamp = profile?.role !== "cho";

  const [sessions, setSessions] = useState<CampSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState("all");
  const [area, setArea] = useState("all");
  const [status, setStatus] = useState<"all" | "open" | "closed">("all");
  const [ownerId, setOwnerId] = useState("all");
  const [owners, setOwners] = useState<Profile[]>([]);

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .catch((e) => setError(e.message ?? "Failed to load sessions"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getCampOwners().then(setOwners).catch(() => {});
  }, []);

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
        if (ownerId !== "all") {
          const owner = owners.find((o) => o.id === ownerId);
          if (s.owner_name !== (owner?.full_name ?? null)) return false;
        }
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

  return (
    <div className="px-5 md:px-10 py-6 md:py-10 w-full">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Care Camps Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {profile?.role === "cho"
              ? "Camps shared with you."
              : profile?.role === "co"
                ? "Your camps and camps shared with you."
                : "Monitor activity across all areas."}
          </p>
        </div>
        {canCreateCamp && (
          <Link
            to="/admin/new"
            className="inline-flex items-center gap-2 h-11 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition shrink-0"
          >
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New Camp</span>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <Stat label="Cities" value={totals.cities} icon={Calendar} />
        <Stat label="Areas" value={totals.areas} icon={Calendar} />
        <Stat label="Total Camps" value={totals.camps} icon={Calendar} />
        <Stat label="Parents" value={totals.parents} icon={Users} />
        <Stat label="Dream Cards" value={totals.cards} icon={Sparkles} />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
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
              {owners.map((o) => (
                <option key={o.id} value={o.id}>{o.full_name || o.id.slice(0, 8)}</option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">Loading camps…</div>
        ) : error ? (
          <div className="px-5 py-10 text-center text-sm text-destructive">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            {sessions.length === 0
              ? profile?.role === "cho"
                ? "No camps have been shared with you yet. Ask your CO to share a camp with you."
                : "No camps yet. Create one to get started."
              : "No camps match these filters."}
          </div>
        ) : (
          <>
            {/* Mobile: stacked cards. Tablet: 2-col grid. */}
            <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3 p-3">
              {filtered.map((s) => (
                <Link
                  key={s.id}
                  to="/admin/sessions/$sessionId"
                  params={{ sessionId: s.id }}
                  className="block p-4 rounded-lg border border-border bg-background hover:bg-secondary/40 transition"
                >
                  <div className="font-semibold text-foreground">
                    {s.city} — {s.area}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Tag icon={<Calendar className="h-3 w-3" />}>
                      {new Date(s.date + "T00:00:00").toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </Tag>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                        s.is_open
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {s.is_open ? "● Open" : "Closed"}
                    </span>
                  </div>
                  <div className="flex items-center gap-5 mt-4 pt-3 border-t border-border">
                    <div>
                      <div className="font-bold tabular-nums text-foreground">{s.parent_count}</div>
                      <div className="text-xs text-muted-foreground">Parents</div>
                    </div>
                    <div>
                      <div className="font-bold tabular-nums text-foreground">{s.card_count}</div>
                      <div className="text-xs text-muted-foreground">Cards</div>
                    </div>
                    <span className="ml-auto inline-flex items-center gap-1 text-primary font-semibold text-sm">
                      View <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop: full table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left font-semibold px-5 py-3">Camp</th>
                    <th className="text-left font-semibold px-5 py-3">Area</th>
                    <th className="text-left font-semibold px-5 py-3">Date</th>
                    <th className="text-left font-semibold px-5 py-3">Status</th>
                    <th className="text-right font-semibold px-5 py-3">Parents</th>
                    <th className="text-right font-semibold px-5 py-3">Cards</th>
                    <th className="text-right font-semibold px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-secondary/30 group">
                      <td className="px-5 py-3 font-semibold text-foreground">
                        {s.city} — {s.area}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{s.area}</td>
                      <td className="px-5 py-3 text-muted-foreground tabular-nums">
                        {new Date(s.date + "T00:00:00").toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            s.is_open
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {s.is_open ? "● Open" : "Closed"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-bold tabular-nums">
                        {s.parent_count}
                      </td>
                      <td className="px-5 py-3 text-right font-bold tabular-nums">
                        {s.card_count}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          to="/admin/sessions/$sessionId"
                          params={{ sessionId: s.id }}
                          className="inline-flex items-center gap-1 text-primary font-semibold group-hover:gap-2 transition-all"
                        >
                          View <ArrowRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Tag({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium">
      {icon}
      {children}
    </span>
  );
}
