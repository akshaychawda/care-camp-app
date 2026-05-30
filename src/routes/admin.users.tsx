import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, X, UserCheck, UserX, RefreshCw, UserPlus, Loader2 } from "lucide-react";
import {
  getPendingUsers,
  getAllUsers,
  approveUser,
  rejectUser,
  disableUser,
  enableUser,
  updateUserRole,
} from "@/lib/api";
import type { Profile, UserRole } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/users")({
  component: UsersPage,
});

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  mad_employee: "MAD Employee",
  co: "Chapter Organizer",
  cho: "Community Health Organizer",
};

const ROLE_BADGE: Record<UserRole, string> = {
  super_admin: "bg-purple-500/15 text-purple-400",
  mad_employee: "bg-blue-500/15 text-blue-400",
  co: "bg-emerald-500/15 text-emerald-400",
  cho: "bg-amber-500/15 text-amber-400",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400",
  disabled: "bg-red-500/15 text-red-400",
  rejected: "bg-red-500/15 text-red-400",
};

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold ${ROLE_BADGE[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

function PendingRow({
  user,
  onApprove,
  onReject,
}: {
  user: Profile;
  onApprove: (id: string, role: UserRole) => void;
  onReject: (id: string) => void;
}) {
  const [role, setRole] = useState<UserRole>(user.role);
  const [busy, setBusy] = useState(false);

  const approve = async () => {
    setBusy(true);
    await onApprove(user.id, role);
    setBusy(false);
  };

  const reject = async () => {
    setBusy(true);
    await onReject(user.id);
    setBusy(false);
  };

  return (
    <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-foreground">{user.full_name || "—"}</div>
        <div className="text-sm text-muted-foreground mt-0.5">
          Requested: <RoleBadge role={user.role} />
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {new Date(user.created_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          disabled={busy}
          className="h-9 px-2 rounded-lg border border-border bg-input text-xs font-medium text-foreground"
        >
          <option value="cho">CHO</option>
          <option value="co">CO</option>
          <option value="mad_employee">MAD Employee</option>
          <option value="super_admin">Super Admin</option>
        </select>
        <button
          onClick={approve}
          disabled={busy}
          className="h-9 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Approve
        </button>
        <button
          onClick={reject}
          disabled={busy}
          className="h-9 px-3 rounded-lg border-2 border-destructive text-destructive text-xs font-semibold flex items-center gap-1.5 hover:bg-destructive/10 transition disabled:opacity-40"
        >
          <X className="h-3.5 w-3.5" /> Reject
        </button>
      </div>
    </div>
  );
}

function UserRow({
  user,
  currentRole,
  onDisable,
  onEnable,
  onRoleChange,
}: {
  user: Profile;
  currentRole: UserRole;
  onDisable: (id: string) => void;
  onEnable: (id: string) => void;
  onRoleChange: (id: string, role: UserRole) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [pendingRole, setPendingRole] = useState<UserRole>(user.role);
  const canManage = currentRole === "super_admin" ||
    (currentRole === "mad_employee" && user.role !== "super_admin" && user.role !== "mad_employee");

  const toggle = async () => {
    setBusy(true);
    if (user.status === "active") await onDisable(user.id);
    else await onEnable(user.id);
    setBusy(false);
  };

  const saveRole = async () => {
    if (pendingRole === user.role) return;
    setBusy(true);
    await onRoleChange(user.id, pendingRole);
    setBusy(false);
  };

  const roleDirty = pendingRole !== user.role;

  return (
    <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-foreground">{user.full_name || "—"}</div>
        <div className="flex items-center gap-2 mt-1">
          <RoleBadge role={user.role} />
          <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold ${STATUS_BADGE[user.status] ?? ""}`}>
            {user.status}
          </span>
        </div>
      </div>
      {canManage && (
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={pendingRole}
            onChange={(e) => setPendingRole(e.target.value as UserRole)}
            disabled={busy}
            className="h-9 px-2 rounded-lg border border-border bg-input text-xs font-medium text-foreground"
          >
            <option value="cho">CHO</option>
            <option value="co">CO</option>
            <option value="mad_employee">MAD Employee</option>
            {currentRole === "super_admin" && <option value="super_admin">Super Admin</option>}
          </select>
          {roleDirty && (
            <button
              onClick={saveRole}
              disabled={busy}
              className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save
            </button>
          )}
          <button
            onClick={toggle}
            disabled={busy}
            className={`h-9 px-3 rounded-lg border-2 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40 ${
              user.status === "active"
                ? "border-destructive text-destructive hover:bg-destructive/10"
                : "border-emerald-500 text-emerald-500 hover:bg-emerald-500/10"
            }`}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : user.status === "active" ? (
              <><UserX className="h-3.5 w-3.5" /> Disable</>
            ) : (
              <><UserCheck className="h-3.5 w-3.5" /> Enable</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function InviteModal({
  onClose,
  onInvited,
}: {
  onClose: () => void;
  onInvited: () => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/api/invite-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email, full_name: name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to send invite");
      }
      setDone(true);
      onInvited();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4">
        <h2 className="font-bold text-lg text-foreground">Invite MAD Employee</h2>
        {done ? (
          <div className="text-center space-y-3 py-4">
            <Check className="h-10 w-10 text-emerald-500 mx-auto" />
            <p className="text-sm text-muted-foreground">
              Invite sent to <span className="font-semibold text-foreground">{email}</span>. They'll
              get an email with a login link.
            </p>
            <button onClick={onClose} className="text-sm text-primary font-semibold hover:underline">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-foreground">Full name</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Priya Sharma"
                className="w-full h-11 px-3 rounded-lg border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-foreground">Work email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="priya@makeadiff.in"
                className="w-full h-11 px-3 rounded-lg border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-11 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send invite"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function UsersPage() {
  const { profile } = Route.useRouteContext();
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [pending, setPending] = useState<Profile[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [p, u] = await Promise.all([getPendingUsers(), getAllUsers()]);
      setPending(p);
      setUsers(u);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id: string, role: UserRole) => {
    await approveUser(id, role);
    await load();
  };

  const handleReject = async (id: string) => {
    await rejectUser(id);
    await load();
  };

  const handleDisable = async (id: string) => {
    await disableUser(id);
    await load();
  };

  const handleEnable = async (id: string) => {
    await enableUser(id);
    await load();
  };

  const handleRoleChange = async (id: string, role: UserRole) => {
    await updateUserRole(id, role);
    await load();
  };

  const currentRole = profile?.role ?? "cho";
  const canInvite = currentRole === "super_admin";

  return (
    <div className="px-5 md:px-10 py-6 md:py-10 w-full">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage access requests and team members.</p>
        </div>
        {canInvite && (
          <button
            onClick={() => setShowInvite(true)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition shrink-0"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Invite Employee</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/60 rounded-xl p-1 mb-6 w-fit">
        {(["pending", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              tab === t
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "pending" ? (
              <>
                Pending Requests
                {pending.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {pending.length}
                  </span>
                )}
              </>
            ) : (
              "All Users"
            )}
          </button>
        ))}
        <button
          onClick={load}
          className="ml-1 px-2 py-2 rounded-lg text-muted-foreground hover:text-foreground transition"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tab === "pending" ? (
          pending.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No pending requests.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pending.map((u) => (
                <PendingRow
                  key={u.id}
                  user={u}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
            </div>
          )
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No users yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                currentRole={currentRole as UserRole}
                onDisable={handleDisable}
                onEnable={handleEnable}
                onRoleChange={handleRoleChange}
              />
            ))}
          </div>
        )}
      </div>

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvited={load}
        />
      )}
    </div>
  );
}
