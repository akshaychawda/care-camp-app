import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Plus, Users, Sparkles, Calendar, MapPin } from "lucide-react";
import { SESSIONS, sessionLabel, totals } from "@/lib/admin-data";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Care Camps Dashboard — MAD Admin" },
      { name: "description", content: "Internal dashboard for MAD coordinators." },
    ],
  }),
});

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center">
          <Icon className="h-4 w-4 text-accent-foreground" />
        </div>
      </div>
      <div className="text-3xl font-bold tabular-nums text-foreground">{value.toLocaleString("en-IN")}</div>
    </div>
  );
}

function Dashboard() {
  const t = totals();
  const [city, setCity] = useState("all");
  const [chapter, setChapter] = useState("all");

  const cities = useMemo(() => Array.from(new Set(SESSIONS.map((s) => s.city))).sort(), []);
  const chapters = useMemo(
    () => Array.from(new Set(SESSIONS.filter((s) => city === "all" || s.city === city).map((s) => s.chapter))).sort(),
    [city]
  );

  const filtered = SESSIONS.filter(
    (s) => (city === "all" || s.city === city) && (chapter === "all" || s.chapter === chapter)
  );

  return (
    <div className="px-5 md:px-10 py-6 md:py-10 max-w-6xl">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Care Camps Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor activity across all chapters.</p>
        </div>
        <Link
          to="/admin/new"
          className="inline-flex items-center gap-2 h-11 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition shrink-0"
        >
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New Camp</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Stat label="Total Camps Run" value={t.camps} icon={Calendar} />
        <Stat label="Parents Registered" value={t.parents} icon={Users} />
        <Stat label="Dream Cards Generated" value={t.cards} icon={Sparkles} />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex flex-wrap items-center gap-3">
          <h2 className="font-semibold text-foreground mr-auto">Camp Sessions</h2>
          <select
            value={city}
            onChange={(e) => { setCity(e.target.value); setChapter("all"); }}
            className="h-9 px-3 rounded-md border border-border bg-input text-sm font-medium text-foreground"
            aria-label="Filter by city"
          >
            <option value="all">All Cities</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            className="h-9 px-3 rounded-md border border-border bg-input text-sm font-medium text-foreground"
            aria-label="Filter by chapter"
          >
            <option value="all">All Chapters</option>
            {chapters.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="divide-y divide-border">
          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">No sessions match these filters.</div>
          )}
          {filtered.map((s) => (
            <Link
              key={s.id}
              to="/admin/sessions/$sessionId"
              params={{ sessionId: s.id }}
              className="block px-5 py-4 hover:bg-secondary/40 transition group"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-foreground">{sessionLabel(s)}</div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Tag icon={<MapPin className="h-3 w-3" />}>{s.city}</Tag>
                    <Tag>{s.chapter}</Tag>
                    <Tag icon={<Calendar className="h-3 w-3" />}>
                      {new Date(s.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </Tag>
                  </div>
                </div>
                <div className="flex items-center gap-5 text-sm">
                  <div className="text-right">
                    <div className="font-bold tabular-nums text-foreground">{s.parents}</div>
                    <div className="text-xs text-muted-foreground">Parents</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold tabular-nums text-foreground">{s.cards}</div>
                    <div className="text-xs text-muted-foreground">Cards</div>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1 text-primary font-semibold text-sm group-hover:gap-2 transition-all">
                    View Details <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Tag({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium">
      {icon}{children}
    </span>
  );
}
