import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  XCircle,
  Copy,
  Check,
  UserPlus,
  X,
  RefreshCw,
  Radio,
  ExternalLink,
  Pencil,
  Archive,
  ArchiveRestore,
  CalendarIcon,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { PageGuide } from "@/components/admin/PageGuide";
import QRCode from "qrcode";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CITIES } from "@/lib/cities";
import {
  getSession,
  toggleCampStatus,
  updateSession,
  archiveSession,
  unarchiveSession,
  getCampCollaborators,
  addCampCollaborator,
  removeCampCollaborator,
  getShareableUsers,
  type CampSession,
  type Registration,
  type Collaborator,
} from "@/lib/api";
import { type Profile } from "@/lib/supabase";
import { Route as AdminRoute } from "@/routes/admin";

export const Route = createFileRoute("/admin/sessions/$sessionId")({
  component: SessionDetail,
  errorComponent: ({ error }) => (
    <div className="p-10 text-center">
      <h1 className="text-xl font-bold mb-2">Couldn't load camp</h1>
      <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
      <Link to="/admin/camps" className="text-primary font-semibold">
        ← Back to camps
      </Link>
    </div>
  ),
});

function formatDuration(startIso: string, endIso: string | null): string {
  const endMs = endIso ? new Date(endIso).getTime() : Date.now();
  const totalMin = Math.round((endMs - new Date(startIso).getTime()) / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-secondary/50 rounded-xl px-4 py-3">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
        {label}
      </div>
      <div className="text-lg font-bold text-foreground mt-1 tabular-nums">{value}</div>
    </div>
  );
}

const ROLE_LABEL: Record<string, string> = {
  co: "CO",
  cho: "CHO",
  mad_employee: "MAD Staff",
  super_admin: "Super Admin",
};

function SharePanel({ campId }: { campId: string }) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    getCampCollaborators(campId)
      .then(setCollaborators)
      .catch(() => {});
    getShareableUsers()
      .then(setUsers)
      .catch(() => {});
  }, [campId]);

  const collaboratorIds = new Set(collaborators.map((c) => c.user_id));
  const available = users.filter((u) => !collaboratorIds.has(u.id));

  const handleAdd = async () => {
    if (!selectedUserId) return;
    setAdding(true);
    try {
      await addCampCollaborator(campId, selectedUserId);
      const added = users.find((u) => u.id === selectedUserId);
      if (added)
        setCollaborators((prev) => [
          ...prev,
          { user_id: added.id, full_name: added.full_name, role: added.role },
        ]);
      setSelectedUserId("");
      toast.success("Access granted");
    } catch {
      toast.error("Failed to add access");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (userId: string) => {
    setRemoving(userId);
    try {
      await removeCampCollaborator(campId, userId);
      setCollaborators((prev) => prev.filter((c) => c.user_id !== userId));
      toast.success("Access removed");
    } catch {
      toast.error("Failed to remove access");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="bg-secondary/50 rounded-xl p-4 space-y-3">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
        Share Camp
      </div>

      {collaborators.length === 0 ? (
        <p className="text-xs text-muted-foreground">No one else has access yet.</p>
      ) : (
        <ul className="space-y-2">
          {collaborators.map((c) => (
            <li key={c.user_id} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {c.full_name || "Unnamed"}
                </div>
                <div className="text-xs text-muted-foreground">{ROLE_LABEL[c.role] ?? c.role}</div>
              </div>
              <button
                onClick={() => handleRemove(c.user_id)}
                disabled={removing === c.user_id}
                className="shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition disabled:opacity-40"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 && (
        <div className="flex gap-2">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="flex-1 h-9 px-2 rounded-lg border border-border bg-input text-sm min-w-0"
          >
            <option value="">Add person…</option>
            {available.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.id.slice(0, 8)} ({ROLE_LABEL[u.role] ?? u.role})
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!selectedUserId || adding}
            className="shrink-0 h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition"
          >
            <UserPlus className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function CardCell({ reg }: { reg: Registration }) {
  const [copied, setCopied] = useState(false);

  if (!reg.card_generated) {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground text-sm">
        <XCircle className="h-4 w-4" /> Pending
      </span>
    );
  }

  const url = `${window.location.origin}/card/${reg.id}`;
  const copy = async () => {
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    toast.success(`${reg.child_name}'s card link copied!`);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex items-center gap-3">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-primary font-semibold text-sm hover:underline"
      >
        <ExternalLink className="h-3.5 w-3.5" /> View card
      </a>
      <button
        onClick={copy}
        title="Copy card link"
        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm transition"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        <span className="hidden xl:inline">{copied ? "Copied" : "Copy link"}</span>
      </button>
    </div>
  );
}

function CampQR({ sessionId }: { sessionId: string }) {
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const campLink = `${window.location.origin}/?session=${sessionId}`;

  useEffect(() => {
    QRCode.toDataURL(campLink, { width: 240, margin: 1 })
      .then(setQr)
      .catch(() => {});
  }, [campLink]);

  const copy = async () => {
    await navigator.clipboard.writeText(campLink).catch(() => {});
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center cursor-pointer"
          onClick={() => setFullscreen(false)}
        >
          {qr ? (
            <img src={qr} alt="Camp QR code" className="w-72 h-72 rounded-2xl" />
          ) : (
            <div className="w-72 h-72 rounded-2xl bg-secondary animate-pulse" />
          )}
          <p className="mt-6 text-sm text-gray-500">Tap anywhere to close</p>
        </div>
      )}

      <div className="bg-secondary/50 rounded-xl p-4 space-y-3">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-semibold">
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
          onClick={() => setFullscreen(true)}
          className="w-full h-9 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition"
        >
          Show QR fullscreen ↗
        </button>
        <button
          onClick={copy}
          className="w-full h-9 rounded-lg border-2 border-primary text-primary font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/5 transition"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>
    </>
  );
}

function EditCampModal({
  session,
  onClose,
  onSaved,
}: {
  session: CampSession;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [city, setCity] = useState(session.city);
  const [area, setArea] = useState(session.area);
  const [venue, setVenue] = useState(session.venue ?? "");
  const [date, setDate] = useState<Date | undefined>(new Date(session.date + "T00:00:00"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputCls =
    "w-full h-11 px-3 rounded-lg border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city || !area || !date) return;
    setSaving(true);
    setError(null);
    try {
      await updateSession(session.id, { city, area, venue, date: format(date, "yyyy-MM-dd") });
      toast.success("Camp updated");
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update camp");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="font-bold text-lg text-foreground">Edit camp</h2>
        <form onSubmit={save} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-foreground">City</span>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              className={inputCls}
            >
              <option value="" disabled>
                Select a city
              </option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-foreground">Area / Community</span>
            <input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              required
              className={inputCls}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-foreground">Venue</span>
            <input value={venue} onChange={(e) => setVenue(e.target.value)} className={inputCls} />
          </label>
          <div className="block space-y-1.5">
            <span className="text-sm font-semibold text-foreground">Date</span>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "w-full h-11 px-3 rounded-lg border border-border bg-input text-sm flex items-center justify-between text-left",
                    !date && "text-muted-foreground",
                  )}
                >
                  {date ? format(date, "PPP") : "Pick a date"}
                  <CalendarIcon className="h-4 w-4 opacity-60" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !city || !area || !date}
              className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 hover:opacity-90 transition"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SessionDetail() {
  const { sessionId } = Route.useParams();
  const { profile } = AdminRoute.useRouteContext();
  const canManageCamp = profile?.role !== "cho";

  const [session, setSession] = useState<CampSession | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const [toggling, setToggling] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const navigate = useNavigate();

  const reloadSession = async () => {
    const { session: s } = await getSession(sessionId);
    setSession(s);
    setIsOpen(s.is_open);
  };

  const handleArchive = async () => {
    if (
      !window.confirm("Archive this camp? It will be hidden from lists and metrics. Data is kept.")
    )
      return;
    setArchiving(true);
    try {
      await archiveSession(sessionId);
      toast.success("Camp archived");
      navigate({ to: "/admin/camps" });
    } catch {
      toast.error("Failed to archive camp");
      setArchiving(false);
    }
  };

  const handleUnarchive = async () => {
    setArchiving(true);
    try {
      await unarchiveSession(sessionId);
      await reloadSession();
      toast.success("Camp restored");
    } catch {
      toast.error("Failed to restore camp");
    } finally {
      setArchiving(false);
    }
  };

  const loadRegistrations = async () => {
    if (!sessionId) return;
    try {
      const { registrations: regs } = await getSession(sessionId);
      setRegistrations(regs);
    } catch {
      // silent — don't overwrite existing data on refresh failure
    }
  };

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

  useEffect(() => {
    if (!isOpen) return;
    const id = setInterval(loadRegistrations, 30_000);
    return () => clearInterval(id);
  }, [isOpen]);

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
        <Link to="/admin/camps" className="text-primary font-semibold">
          ← Back to camps
        </Link>
      </div>
    );

  const dateStr = new Date(session.date + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="px-5 md:px-8 lg:px-10 py-6 md:py-10 w-full max-w-[1400px] mx-auto">
      <Link
        to="/admin/camps"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Camps
      </Link>
      <PageGuide pageKey="session-detail" role={profile?.role ?? "cho"} />

      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
        {session.city} — {session.area} — {dateStr}
      </h1>

      <div className="flex items-center flex-wrap gap-3 mb-6">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            isOpen ? "bg-emerald-500/10 text-emerald-500" : "bg-secondary text-muted-foreground"
          }`}
        >
          {isOpen && <Radio className="h-3 w-3" />}
          {isOpen ? "Open" : "Closed"}
        </span>
        {session.archived_at && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500">
            <Archive className="h-3 w-3" /> Archived
          </span>
        )}
        {canManageCamp && !session.archived_at && (
          <>
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
            <button
              onClick={() => setShowEdit(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button
              onClick={handleArchive}
              disabled={archiving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 border-border text-muted-foreground hover:text-amber-500 hover:border-amber-400/40 disabled:opacity-40 transition"
            >
              <Archive className="h-3.5 w-3.5" /> Archive
            </button>
          </>
        )}
        {canManageCamp && session.archived_at && (
          <button
            onClick={handleUnarchive}
            disabled={archiving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 border-emerald-400 text-emerald-500 hover:bg-emerald-400/10 disabled:opacity-40 transition"
          >
            <ArchiveRestore className="h-3.5 w-3.5" /> Restore camp
          </button>
        )}
      </div>

      {showEdit && session && (
        <EditCampModal
          session={session}
          onClose={() => setShowEdit(false)}
          onSaved={async () => {
            await reloadSession();
            setShowEdit(false);
          }}
        />
      )}

      {session.parent_count > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-6 text-sm text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">{session.parent_count}</span> parents
          </span>
          <span>·</span>
          <span>
            <span className="font-semibold text-foreground">
              {Math.round((session.card_count / session.parent_count) * 100)}%
            </span>{" "}
            got cards
          </span>
          <span>·</span>
          <span>
            {session.closed_at ? (
              <>
                Ran for{" "}
                <span className="font-semibold text-foreground">
                  {formatDuration(session.created_at, session.closed_at)}
                </span>
              </>
            ) : (
              <>
                Open for{" "}
                <span className="font-semibold text-foreground">
                  {formatDuration(session.created_at, null)}
                </span>
              </>
            )}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats + QR column */}
        <aside className="md:col-span-1 space-y-3">
          <StatBlock label="Parents Registered" value={session.parent_count} />
          <StatBlock label="Cards Generated" value={session.card_count} />
          <StatBlock label="Date" value={dateStr} />
          <StatBlock label="City" value={session.city} />
          <StatBlock label="Area" value={session.area} />
          {session.venue && <StatBlock label="Venue" value={session.venue} />}
          <CampQR sessionId={sessionId} />
          {canManageCamp && <SharePanel campId={sessionId} />}
        </aside>

        {/* Registrations column */}
        <section className="md:col-span-2 bg-secondary/30 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">Registrations</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {registrations.length} registered
              </p>
            </div>
            <button
              onClick={loadRegistrations}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition"
              title="Refresh registrations"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {registrations.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              No registrations yet for this camp.
            </div>
          ) : (
            <>
              {/* Mobile + tablet: card list */}
              <div className="lg:hidden divide-y divide-border/60">
                {registrations.map((r) => (
                  <div key={r.id} className="px-5 py-4">
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground">{r.name}</div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        Child: <span className="font-medium text-foreground">{r.child_name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground tabular-nums mt-0.5">
                        {r.phone}
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">{r.area}</div>
                    </div>
                    <div className="mt-2.5">
                      <CardCell reg={r} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60 text-[11px] uppercase tracking-widest text-muted-foreground/60">
                    <tr>
                      <th className="text-left font-semibold px-5 py-3">Name</th>
                      <th className="text-left font-semibold px-5 py-3">Child</th>
                      <th className="text-left font-semibold px-5 py-3">Phone</th>
                      <th className="text-left font-semibold px-5 py-3">Neighbourhood</th>
                      <th className="text-left font-semibold px-5 py-3">Card</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {registrations.map((r) => (
                      <tr key={r.id} className="hover:bg-secondary/30">
                        <td className="px-5 py-3 font-medium text-foreground">{r.name}</td>
                        <td className="px-5 py-3 text-muted-foreground">{r.child_name}</td>
                        <td className="px-5 py-3 text-muted-foreground tabular-nums">{r.phone}</td>
                        <td className="px-5 py-3 text-muted-foreground">{r.area}</td>
                        <td className="px-5 py-3">
                          <CardCell reg={r} />
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
