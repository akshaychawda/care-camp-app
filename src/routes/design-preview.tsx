import { createFileRoute } from "@tanstack/react-router";
import {
  Users, Sparkles, Tent, Radio, Archive,
  Clock, UserCheck, ImageIcon, TrendingUp,
  Activity, CheckCircle2, BarChart3, Layers,
  ArrowUpRight,
} from "lucide-react";
import type React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";

export const Route = createFileRoute("/design-preview")({
  component: DesignPreview,
});

// ─── Dummy data ───────────────────────────────────────────────────────────────

const STATS = {
  totalChildren: 247,
  uniqueParents: 189,
  cardsGenerated: 201,
  cardSuccessRate: 81,
  totalCamps: 12,
  activeCamps: 1,
  closedCamps: 11,
  avgDuration: "1h 45m",
  avgParentsPerCamp: 17,
  avgCardsPerCamp: 14,
};

const WEEKLY = [
  { w: "W1", n: 0 }, { w: "W2", n: 0 }, { w: "W3", n: 0 }, { w: "W4", n: 4 },
  { w: "W5", n: 18 }, { w: "W6", n: 0 }, { w: "W7", n: 0 }, { w: "W8", n: 31 },
  { w: "W9", n: 0 }, { w: "W10", n: 52 }, { w: "W11", n: 84 }, { w: "W12", n: 58 },
];

const CITIES = [
  { city: "Mumbai", count: 5 },
  { city: "Pune", count: 3 },
  { city: "Nagpur", count: 2 },
  { city: "Nashik", count: 2 },
];

// ─── Shared ───────────────────────────────────────────────────────────────────

function VariantLabel({ num, name, desc }: { num: number; name: string; desc: string }) {
  return (
    <div className="mb-6 pb-4 border-b border-border">
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-black text-primary">0{num}</span>
        <h2 className="text-xl font-bold text-foreground">{name}</h2>
      </div>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}

// ─── VARIANT 1: Editorial (Stripe-inspired) ───────────────────────────────────
// Clean 1px borders, dominant numbers, Lucide icons, single red accent, generous padding

function Variant1() {
  return (
    <div className="bg-background p-8 rounded-2xl border border-border">
      <VariantLabel
        num={1}
        name="Editorial"
        desc="Dominant numbers, single accent, Lucide icons, generous whitespace — Stripe DNA"
      />

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Children</span>
          </div>
          <p className="text-4xl font-black text-foreground">{STATS.totalChildren.toLocaleString("en-IN")}</p>
          <p className="text-xs text-muted-foreground mt-2">Dreams captured</p>
        </div>

        {/* Primary KPI — left accent border */}
        <div className="bg-card border border-border rounded-xl p-6 border-l-4 border-l-primary">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parents</span>
          </div>
          <p className="text-4xl font-black text-foreground">{STATS.uniqueParents.toLocaleString("en-IN")}</p>
          <p className="text-xs text-muted-foreground mt-2">Unique families reached</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Card Rate</span>
          </div>
          <p className="text-4xl font-black text-foreground">{STATS.cardSuccessRate}%</p>
          <p className="text-xs text-emerald-500 font-medium mt-2 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {STATS.cardsGenerated} of {STATS.totalChildren} generated
          </p>
        </div>
      </div>

      {/* Activity + Efficiency — combined row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Tent className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Camps</span>
          </div>
          <p className="text-3xl font-black text-foreground">{STATS.totalCamps}</p>
          <div className="flex items-center gap-3 mt-3">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <Radio className="h-2.5 w-2.5" /> {STATS.activeCamps} live
            </span>
            <span className="text-xs text-muted-foreground">{STATS.closedCamps} closed</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg Duration</span>
          </div>
          <p className="text-3xl font-black text-foreground">{STATS.avgDuration}</p>
          <p className="text-xs text-muted-foreground mt-2">Per closed camp</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg Turnout</span>
          </div>
          <p className="text-3xl font-black text-foreground">{STATS.avgParentsPerCamp}</p>
          <p className="text-xs text-muted-foreground mt-2">Parents per closed camp</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-sm font-bold text-foreground">Registrations</p>
            <p className="text-xs text-muted-foreground mt-0.5">Last 12 weeks</p>
          </div>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-md">247 total</span>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={WEEKLY} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
            <XAxis dataKey="w" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => [v, "Registrations"]}
            />
            <Bar dataKey="n" fill="var(--primary)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── VARIANT 2: Minimal (Linear/Vercel-inspired) ──────────────────────────────
// No borders, background-only separation, very sparse labels, pure whitespace rhythm

function Variant2() {
  return (
    <div className="bg-background p-8 rounded-2xl border border-border">
      <VariantLabel
        num={2}
        name="Minimal"
        desc="No card borders, background separation only, stripped labels, Linear/Vercel DNA"
      />

      {/* Primary KPI strip — no borders */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-secondary/50 rounded-xl p-5">
          <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-3">Children</p>
          <p className="text-5xl font-black text-foreground leading-none">{STATS.totalChildren}</p>
          <p className="text-xs text-muted-foreground mt-2.5">Dreams captured</p>
        </div>
        <div className="bg-primary/[0.06] rounded-xl p-5">
          <p className="text-[11px] font-semibold text-primary/60 uppercase tracking-widest mb-3">Parents</p>
          <p className="text-5xl font-black text-primary leading-none">{STATS.uniqueParents}</p>
          <p className="text-xs text-muted-foreground mt-2.5">Unique families</p>
        </div>
        <div className="bg-secondary/50 rounded-xl p-5">
          <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-3">Card Rate</p>
          <p className="text-5xl font-black text-foreground leading-none">{STATS.cardSuccessRate}%</p>
          <p className="text-xs text-emerald-500 mt-2.5">{STATS.cardsGenerated} generated</p>
        </div>
      </div>

      {/* Secondary metrics — much smaller, no visual weight */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: "Total camps", value: STATS.totalCamps, icon: Tent },
          { label: "Live now", value: STATS.activeCamps, icon: Activity, color: "text-emerald-500" },
          { label: "Avg duration", value: STATS.avgDuration, icon: Clock },
          { label: "Avg parents", value: STATS.avgParentsPerCamp, icon: UserCheck },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex items-center gap-3 py-4 px-4 rounded-xl bg-secondary/30">
            <Icon className={`h-4 w-4 shrink-0 ${color ?? "text-muted-foreground"}`} />
            <div>
              <p className={`text-xl font-black leading-none ${color ?? "text-foreground"}`}>{value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart — area, softer */}
      <div className="bg-secondary/30 rounded-xl p-5">
        <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-4">Registrations — last 12 weeks</p>
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={WEEKLY} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="colorN" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="w" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => [v, "Registrations"]}
            />
            <Area type="monotone" dataKey="n" stroke="var(--primary)" strokeWidth={2} fill="url(#colorN)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── VARIANT 3: Dashboard Pro (Amplitude / data-tool inspired) ────────────────
// Full-width KPI strip with dividers, inline trend indicators, dense but readable

function Variant3() {
  return (
    <div className="bg-background p-8 rounded-2xl border border-border">
      <VariantLabel
        num={3}
        name="Dashboard Pro"
        desc="Full-width KPI strip, trend arrows, inline context, Amplitude/Mixpanel DNA"
      />

      {/* Hero strip — full width, divided sections */}
      <div className="grid grid-cols-4 divide-x divide-border border border-border rounded-xl mb-6 overflow-hidden bg-card">
        {[
          { label: "Children reached", value: STATS.totalChildren, sub: "Dreams captured", icon: Users, highlight: false },
          { label: "Parents registered", value: STATS.uniqueParents, sub: "Unique families", icon: Users, highlight: true },
          { label: "Cards generated", value: STATS.cardsGenerated, sub: `${STATS.cardSuccessRate}% success rate`, icon: Sparkles, highlight: false },
          { label: "Camps run", value: STATS.totalCamps, sub: `${STATS.closedCamps} completed`, icon: Tent, highlight: false },
        ].map(({ label, value, sub, icon: Icon, highlight }) => (
          <div key={label} className={`p-5 ${highlight ? "bg-primary/[0.04]" : ""}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-muted-foreground">{label}</p>
              <Icon className={`h-3.5 w-3.5 ${highlight ? "text-primary" : "text-muted-foreground/50"}`} />
            </div>
            <p className={`text-3xl font-black ${highlight ? "text-primary" : "text-foreground"}`}>
              {typeof value === "number" ? value.toLocaleString("en-IN") : value}
            </p>
            <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Efficiency row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Avg camp duration", value: STATS.avgDuration, sub: `Across ${STATS.closedCamps} camps`, icon: Clock },
          { label: "Avg parents / camp", value: STATS.avgParentsPerCamp, sub: "Per completed camp", icon: UserCheck },
          { label: "Avg cards / camp", value: STATS.avgCardsPerCamp, sub: "Per completed camp", icon: ImageIcon },
        ].map(({ label, value, sub, icon: Icon }) => (
          <div key={label} className="border border-border rounded-xl p-5 bg-card flex items-start gap-4">
            <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xl font-black text-foreground">{value}</p>
              <p className="text-xs font-semibold text-foreground mt-0.5">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + city side by side */}
      <div className="grid grid-cols-5 gap-3">
        <div className="col-span-3 border border-border rounded-xl p-5 bg-card">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-foreground">Registrations per week</p>
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <ArrowUpRight className="h-3 w-3" /> +84 this week
            </span>
          </div>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={WEEKLY} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
              <XAxis dataKey="w" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [v, "Registrations"]}
              />
              <Bar dataKey="n" fill="var(--primary)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-2 border border-border rounded-xl p-5 bg-card">
          <p className="text-sm font-bold text-foreground mb-4">By city</p>
          <div className="space-y-3">
            {CITIES.map((c) => (
              <div key={c.city} className="flex items-center gap-3">
                <span className="text-xs font-medium text-foreground w-16 shrink-0">{c.city}</span>
                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${(c.count / CITIES[0].count) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-muted-foreground w-4 text-right shrink-0">{c.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-border grid grid-cols-2 gap-2">
            <div className="text-center">
              <p className="text-base font-black text-foreground">{STATS.activeCamps}</p>
              <p className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wider">Live</p>
            </div>
            <div className="text-center">
              <p className="text-base font-black text-foreground">{STATS.avgParentsPerCamp}</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Avg/camp</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VARIANT 4: Hybrid (Editorial layout + Minimal visual style) ─────────────

function TileLabel({ icon: Icon, children }: { icon: React.ElementType; children: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      <Icon className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
      <span className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">{children}</span>
    </div>
  );
}

function Variant4() {
  return (
    <div className="bg-background p-8 rounded-2xl border-2 border-primary/30">
      <VariantLabel
        num={4}
        name="Hybrid — Your Pick"
        desc="Editorial's layout and metrics · Minimal's borderless tiles, stripped labels, muted everything"
      />

      {/* Row 1 — Reach */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-secondary/50 rounded-xl p-5">
          <TileLabel icon={Users}>Children</TileLabel>
          <p className="text-4xl font-black text-foreground leading-none">{STATS.totalChildren}</p>
          <p className="text-xs text-muted-foreground mt-2.5">Dreams captured</p>
        </div>
        <div className="bg-primary/[0.07] rounded-xl p-5">
          <TileLabel icon={Users}>Parents</TileLabel>
          <p className="text-4xl font-black text-primary leading-none">{STATS.uniqueParents}</p>
          <p className="text-xs text-muted-foreground mt-2.5">Unique families reached</p>
        </div>
        <div className="bg-secondary/50 rounded-xl p-5">
          <TileLabel icon={Sparkles}>Card rate</TileLabel>
          <p className="text-4xl font-black text-foreground leading-none">{STATS.cardSuccessRate}%</p>
          <p className="text-xs text-emerald-500 font-medium mt-2.5 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />{STATS.cardsGenerated} of {STATS.totalChildren}
          </p>
        </div>
      </div>

      {/* Row 2 — Ops */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-secondary/50 rounded-xl p-5">
          <TileLabel icon={Tent}>Camps</TileLabel>
          <p className="text-4xl font-black text-foreground leading-none">{STATS.totalCamps}</p>
          <div className="flex items-center gap-2.5 mt-2.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
              <Radio className="h-2.5 w-2.5" />{STATS.activeCamps} live
            </span>
            <span className="text-xs text-muted-foreground">{STATS.closedCamps} closed</span>
          </div>
        </div>
        <div className="bg-secondary/50 rounded-xl p-5">
          <TileLabel icon={Clock}>Avg duration</TileLabel>
          <p className="text-4xl font-black text-foreground leading-none">{STATS.avgDuration}</p>
          <p className="text-xs text-muted-foreground mt-2.5">Across {STATS.closedCamps} camps</p>
        </div>
        <div className="bg-secondary/50 rounded-xl p-5">
          <TileLabel icon={UserCheck}>Avg turnout</TileLabel>
          <p className="text-4xl font-black text-foreground leading-none">{STATS.avgParentsPerCamp}</p>
          <p className="text-xs text-muted-foreground mt-2.5">Parents per camp</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-secondary/50 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-foreground">Registrations</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Last 12 weeks</span>
            <span className="text-xs font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-md">{STATS.totalChildren} total</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={WEEKLY} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
            <XAxis dataKey="w" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [v, "Registrations"]} />
            <Bar dataKey="n" fill="var(--primary)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function DesignPreview() {
  return (
    <div className="min-h-screen bg-secondary/30 py-10 px-6">
      <div className="max-w-3xl mx-auto space-y-10">
        <div className="text-center pb-4">
          <h1 className="text-3xl font-black text-foreground">Overview — Design Variants</h1>
          <p className="text-sm text-muted-foreground mt-2">Same data, three different design directions. Pick your favourite.</p>
        </div>
        <Variant4 />
        <Variant1 />
        <Variant2 />
        <Variant3 />
      </div>
    </div>
  );
}
