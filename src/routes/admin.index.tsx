import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus, Users, Sparkles, Calendar } from "lucide-react";
import { Route as AdminRoute } from "@/routes/admin";
import { getSessions, type CampSession } from "@/lib/api";

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
  const [chapter, setChapter] = useState("all");

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .catch((e) => setError(e.message ?? "Failed to load sessions"))
      .finally(() => setLoading(false));
  }, []);

  const cities = useMemo(() => Array.from(new Set(sessions.map((s) => s.city))).sort(), [sessions]);
  const chapters = useMemo(
    () =>
      Array.from(
        new Set(sessions.filter((s) => city === "all" || s.city === city).map((s) => s.chapter)),
      ).sort(),
    [city, sessions],
  );

  const filtered = useMemo(
    () =>
      sessions.filter(
        (s) => (city === "all" || s.city === city) && (chapter === "all" || s.chapter === chapter),
      ),
    [sessions, city, chapter],
  );

  const totals = useMemo(
    () => ({
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
                : "Monitor activity across all chapters."}
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Stat label="Total Camps Run" value={totals.camps} icon={Calendar} />
        <Stat label="Parents Registered" value={totals.parents} icon={Users} />
        <Stat label="Dream Cards Generated" value={totals.cards} icon={Sparkles} />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
          <h2 className="font-semibold text-foreground mr-auto">Camps</h2>
          <select
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setChapter("all");
            }}
            className="h-9 px-3 rounded-md border border-border bg-input text-sm font-medium text-foreground"
            aria-label="Filter by city"
          >
            <option value="all">All Cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            className="h-9 px-3 rounded-md border border-border bg-input text-sm font-medium text-foreground"
            aria-label="Filter by chapter"
          >
            <option value="all">All Chapters</option>
            {chapters.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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
                    {s.city} — {s.chapter}
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
                    <th className="text-left font-semibold px-5 py-3">Chapter</th>
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
                        {s.city} — {s.chapter}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{s.chapter}</td>
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
