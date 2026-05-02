import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { SESSIONS, SAMPLE_REGISTRATIONS, sessionLabel } from "@/lib/admin-data";

export const Route = createFileRoute("/admin/sessions/$sessionId")({
  loader: ({ params }) => {
    const session = SESSIONS.find((s) => s.id === params.sessionId);
    if (!session) throw notFound();
    return { session };
  },
  notFoundComponent: () => (
    <div className="p-10 text-center">
      <h1 className="text-xl font-bold mb-2">Session not found</h1>
      <Link to="/admin" className="text-primary font-semibold">← Back to dashboard</Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-10 text-center">
      <h1 className="text-xl font-bold mb-2">Couldn't load session</h1>
      <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
      <Link to="/admin" className="text-primary font-semibold">← Back to dashboard</Link>
    </div>
  ),
  component: SessionDetail,
});

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="text-lg font-bold text-foreground mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function CardYesNo({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1.5 text-whatsapp font-semibold text-sm">
      <CheckCircle2 className="h-4 w-4" /> Card generated
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground text-sm">
      <XCircle className="h-4 w-4" /> Pending
    </span>
  );
}

function SessionDetail() {
  const { session } = Route.useLoaderData();
  const dateStr = new Date(session.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const rows = SAMPLE_REGISTRATIONS.slice(0, Math.min(8, session.parents));

  return (
    <div className="px-5 md:px-8 lg:px-10 py-6 md:py-10 max-w-7xl">
      <Link to="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6">{sessionLabel(session)}</h1>

      {/* Tablet+: 2-column layout (stats left, registrations right). Mobile: stacked. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats column */}
        <aside className="md:col-span-1 space-y-3">
          <StatBlock label="Parents Registered" value={session.parents} />
          <StatBlock label="Cards Generated" value={session.cards} />
          <StatBlock label="Date" value={dateStr} />
          <StatBlock label="City" value={session.city} />
          <StatBlock label="Chapter" value={session.chapter} />
        </aside>

        {/* Registrations column */}
        <section className="md:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Registrations</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Showing {rows.length} of {session.parents}</p>
          </div>

          {/* Mobile + tablet: card list */}
          <div className="lg:hidden divide-y divide-border">
            {rows.map((r, i) => (
              <div key={i} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground">{r.name}</div>
                    <div className="text-sm text-muted-foreground tabular-nums mt-0.5">{r.phone}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">{r.area}</div>
                  </div>
                  <CardYesNo ok={r.cardGenerated} />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left font-semibold px-5 py-3">Name</th>
                  <th className="text-left font-semibold px-5 py-3">Phone</th>
                  <th className="text-left font-semibold px-5 py-3">Neighbourhood</th>
                  <th className="text-left font-semibold px-5 py-3">Card Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-secondary/30">
                    <td className="px-5 py-3 font-medium text-foreground">{r.name}</td>
                    <td className="px-5 py-3 text-muted-foreground tabular-nums">{r.phone}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r.area}</td>
                    <td className="px-5 py-3">
                      {r.cardGenerated ? (
                        <span className="inline-flex items-center gap-1.5 text-whatsapp font-semibold">
                          <CheckCircle2 className="h-4 w-4" /> Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                          <XCircle className="h-4 w-4" /> No
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
