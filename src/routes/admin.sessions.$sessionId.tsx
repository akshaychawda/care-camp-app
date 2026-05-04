import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, XCircle, Copy, Check } from "lucide-react";
import QRCode from "qrcode";
import { getSession, toggleCampStatus, type CampSession, type Registration } from "@/lib/api";

export const Route = createFileRoute("/admin/sessions/$sessionId")({
  component: SessionDetail,
  errorComponent: ({ error }) => (
    <div className="p-10 text-center">
      <h1 className="text-xl font-bold mb-2">Couldn't load camp</h1>
      <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
      <Link to="/admin" className="text-primary font-semibold">
        ← Back to dashboard
      </Link>
    </div>
  ),
});

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
        {label}
      </div>
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

function CampQR({ sessionId }: { sessionId: string }) {
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const campLink = `${window.location.origin}/?session=${sessionId}`;

  useEffect(() => {
    QRCode.toDataURL(campLink, { width: 240, margin: 1 })
      .then(setQr)
      .catch(() => {});
  }, [campLink]);

  const copy = async () => {
    await navigator.clipboard.writeText(campLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
        Camp QR Code
      </div>
      <div className="flex justify-center">
        {qr ? (
          <img src={qr} alt="Camp QR code" className="w-40 h-40 rounded-lg" />
        ) : (
          <div className="w-40 h-40 rounded-lg bg-secondary animate-pulse" />
        )}
      </div>
      <code className="block text-xs text-muted-foreground break-all bg-secondary px-2 py-1.5 rounded">
        {campLink}
      </code>
      <button
        onClick={copy}
        className="w-full h-9 rounded-lg border-2 border-primary text-primary font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/5 transition"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied!" : "Copy Link"}
      </button>
    </div>
  );
}

function SessionDetail() {
  const { sessionId } = Route.useParams();
  const [session, setSession] = useState<CampSession | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    getSession(sessionId)
      .then(({ session, registrations }) => {
        setSession(session);
        setRegistrations(registrations);
        setIsOpen(session.is_open);
      })
      .catch((e) => setError(e.message ?? "Failed to load camp"))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleToggle = async () => {
    if (isOpen === null) return;
    const next = !isOpen;
    setIsOpen(next);
    setToggling(true);
    try {
      await toggleCampStatus(sessionId, next);
    } catch {
      setIsOpen(!next);
    } finally {
      setToggling(false);
    }
  };

  if (loading)
    return <div className="p-10 text-center text-sm text-muted-foreground">Loading camp…</div>;

  if (error || !session)
    return (
      <div className="p-10 text-center">
        <h1 className="text-xl font-bold mb-2">Couldn't load camp</h1>
        <p className="text-sm text-muted-foreground mb-4">{error ?? "Camp not found"}</p>
        <Link to="/admin" className="text-primary font-semibold">
          ← Back to dashboard
        </Link>
      </div>
    );

  const dateStr = new Date(session.date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="px-5 md:px-8 lg:px-10 py-6 md:py-10 max-w-7xl">
      <Link
        to="/admin"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
        {session.city} — {session.chapter} — {dateStr}
      </h1>

      <div className="flex items-center gap-3 mb-6">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            isOpen
              ? "bg-emerald-900/40 text-emerald-400"
              : "bg-red-900/40 text-red-400"
          }`}
        >
          {isOpen ? "Open" : "Closed"}
        </span>
        <button
          onClick={handleToggle}
          disabled={toggling || isOpen === null}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 disabled:opacity-40 transition ${
            isOpen
              ? "border-red-400 text-red-400 hover:bg-red-400/10"
              : "border-emerald-400 text-emerald-400 hover:bg-emerald-400/10"
          }`}
        >
          {toggling ? "Saving…" : isOpen ? "Close Camp" : "Reopen Camp"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats + QR column */}
        <aside className="md:col-span-1 space-y-3">
          <StatBlock label="Parents Registered" value={session.parent_count} />
          <StatBlock label="Cards Generated" value={session.card_count} />
          <StatBlock label="Date" value={dateStr} />
          <StatBlock label="City" value={session.city} />
          <StatBlock label="Chapter" value={session.chapter} />
          <CampQR sessionId={sessionId} />
        </aside>

        {/* Registrations column */}
        <section className="md:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Registrations</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {registrations.length} registered
            </p>
          </div>

          {registrations.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              No registrations yet for this camp.
            </div>
          ) : (
            <>
              {/* Mobile + tablet: card list */}
              <div className="lg:hidden divide-y divide-border">
                {registrations.map((r) => (
                  <div key={r.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground">{r.name}</div>
                        <div className="text-sm text-muted-foreground tabular-nums mt-0.5">
                          {r.phone}
                        </div>
                        <div className="text-sm text-muted-foreground mt-0.5">{r.area}</div>
                      </div>
                      <CardYesNo ok={r.card_generated} />
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
                    {registrations.map((r) => (
                      <tr key={r.id} className="hover:bg-secondary/30">
                        <td className="px-5 py-3 font-medium text-foreground">{r.name}</td>
                        <td className="px-5 py-3 text-muted-foreground tabular-nums">{r.phone}</td>
                        <td className="px-5 py-3 text-muted-foreground">{r.area}</td>
                        <td className="px-5 py-3">
                          <CardYesNo ok={r.card_generated} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
