import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageGuide } from "@/components/admin/PageGuide";
import { Check, X, UserCheck, UserX, RefreshCw, UserPlus, Loader2 } from "lucide-react";
import {
  getAllUsers,
  approveUser,
  rejectUser,
  disableUser,
  enableUser,
  updateUserRole,
  cancelInvite,
  resendInvite,
} from "@/lib/api";
import type { Profile, UserRole, UserStatus } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/users")({
  component: UsersPage,
});

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  mad_employee: "MAD Employee",
  co: "CO",
  cho: "CHO",
};

// Roles are labels, not status — keep monochrome. super_admin gets a faint accent for hierarchy.
const ROLE_BADGE: Record<UserRole, string> = {
  super_admin: "bg-primary/10 text-primary",
  mad_employee: "bg-secondary text-muted-foreground",
  co: "bg-secondary text-muted-foreground",
  cho: "bg-secondary text-muted-foreground",
};

// Status carries operational meaning — semantic colour is intentional here.
const STATUS_BADGE: Record<string, string> = {
  invited: "bg-blue-500/10 text-blue-500",
  pending: "bg-amber-500/10 text-amber-500",
  active: "bg-emerald-500/10 text-emerald-500",
  disabled: "bg-red-500/10 text-red-500",
  rejected: "bg-red-500/10 text-red-500",
};

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  invited: 1,
  active: 2,
  disabled: 3,
  rejected: 4,
};

const AVATAR_COLOR: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-500",
  invited: "bg-blue-500/10 text-blue-500",
  active: "bg-emerald-500/10 text-emerald-500",
  disabled: "bg-red-500/10 text-red-500",
  rejected: "bg-red-500/10 text-red-500",
};

function sortUsers(users: Profile[]): Profile[] {
  return [...users].sort((a, b) => {
    const orderDiff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
    if (orderDiff !== 0) return orderDiff;
    return (a.full_name || "").localeCompare(b.full_name || "");
  });
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold ${ROLE_BADGE[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold capitalize ${STATUS_BADGE[status] ?? ""}`}>
      {status}
    </span>
  );
}

function Avatar({ name, status }: { name: string; status: UserStatus }) {
  const initial = (name || "?")[0].toUpperCase();
  return (
    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${AVATAR_COLOR[status] ?? "bg-secondary text-foreground"}`}>
      {initial}
    </div>
  );
}

function FilterPill({
  label,
  count,
  active,
  onClick,
  variant = "default",
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
  variant?: "default" | "pending";
}) {
  const activeClass = active
    ? variant === "pending"
      ? "bg-amber-500 text-white"
      : "bg-primary text-primary-foreground"
    : "bg-secondary/60 text-muted-foreground hover:text-foreground";
  return (
    <button
      onClick={onClick}
      className={`h-8 px-3.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 ${activeClass}`}
    >
      {label}
      {count !== undefined && (
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${active ? "bg-white/25" : "bg-background/60 text-muted-foreground"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function UserRow({
  user,
  currentRole,
  onApprove,
  onReject,
  onDisable,
  onEnable,
  onRoleChange,
  onCancel,
  onResend,
  onReinvite,
}: {
  user: Profile;
  currentRole: UserRole;
  onApprove: (id: string, role: UserRole) => void;
  onReject: (id: string) => void;
  onDisable: (id: string) => void;
  onEnable: (id: string) => void;
  onRoleChange: (id: string, role: UserRole) => void;
  onCancel: (id: string) => void;
  onResend: (email: string, fullName: string) => void;
  onReinvite: (email: string, fullName: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [assignRole, setAssignRole] = useState<UserRole | "">("");
  const [pendingRole, setPendingRole] = useState<UserRole>(user.role);
  const [showRoleEdit, setShowRoleEdit] = useState(false);

  const wrap = (fn: () => Promise<void>) => async () => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  const isNonMad = user.email && !user.email.endsWith("@makeadiff.in");
  const canManage = currentRole === "super_admin" ||
    (currentRole === "mad_employee" && user.role !== "super_admin" && user.role !== "mad_employee");

  return (
    <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Avatar name={user.full_name || user.email || "?"} status={user.status} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-foreground text-sm">{user.full_name || "—"}</div>
          {user.email && (
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              <span className="text-xs text-muted-foreground">{user.email}</span>
              {isNonMad && (
                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-500">
                  non-MAD email
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            <RoleBadge role={user.role} />
            <StatusBadge status={user.status} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        {/* PENDING */}
        {user.status === "pending" && canManage && (
          <>
            <select
              value={assignRole}
              onChange={(e) => setAssignRole(e.target.value as UserRole)}
              disabled={busy}
              className={`h-9 px-2 rounded-lg border bg-input text-xs font-medium transition ${!assignRole ? "border-amber-400 text-muted-foreground" : "border-border text-foreground"}`}
            >
              <option value="" disabled>Assign role…</option>
              <option value="cho">CHO</option>
              <option value="co">CO</option>
              <option value="mad_employee">MAD Employee</option>
              {currentRole === "super_admin" && <option value="super_admin">Super Admin</option>}
            </select>
            <button
              onClick={wrap(() => onApprove(user.id, assignRole as UserRole))}
              disabled={busy || !assignRole}
              className="h-9 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Approve
            </button>
            <button
              onClick={wrap(() => onReject(user.id))}
              disabled={busy}
              className="h-9 px-3 rounded-lg border-2 border-destructive text-destructive text-xs font-semibold flex items-center gap-1.5 hover:bg-destructive/10 transition disabled:opacity-40"
            >
              <X className="h-3.5 w-3.5" /> Reject
            </button>
          </>
        )}

        {/* INVITED */}
        {user.status === "invited" && canManage && (
          <>
            <button
              onClick={wrap(async () => { onResend(user.email ?? "", user.full_name); })}
              disabled={busy}
              className="h-9 px-3 rounded-lg border-2 border-primary text-primary text-xs font-semibold flex items-center gap-1.5 hover:bg-primary/10 transition disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Resend
            </button>
            <button
              onClick={wrap(async () => { onCancel(user.id); })}
              disabled={busy}
              className="h-9 px-3 rounded-lg border-2 border-destructive text-destructive text-xs font-semibold flex items-center gap-1.5 hover:bg-destructive/10 transition disabled:opacity-40"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          </>
        )}

        {/* ACTIVE */}
        {user.status === "active" && canManage && (
          <>
            {showRoleEdit ? (
              <>
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
                <button
                  onClick={wrap(async () => { await onRoleChange(user.id, pendingRole); setShowRoleEdit(false); })}
                  disabled={busy || pendingRole === user.role}
                  className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 transition disabled:opacity-40"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Save
                </button>
                <button onClick={() => setShowRoleEdit(false)} className="h-9 px-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowRoleEdit(true)}
                  className="h-9 px-3 rounded-lg border-2 border-border text-xs font-semibold text-muted-foreground flex items-center gap-1.5 hover:border-primary/40 hover:text-foreground transition"
                >
                  Change role
                </button>
                <button
                  onClick={wrap(() => onDisable(user.id))}
                  disabled={busy}
                  className="h-9 px-3 rounded-lg border-2 border-destructive text-destructive text-xs font-semibold flex items-center gap-1.5 hover:bg-destructive/10 transition disabled:opacity-40"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
                  Disable
                </button>
              </>
            )}
          </>
        )}

        {/* DISABLED */}
        {user.status === "disabled" && canManage && (
          <button
            onClick={wrap(() => onEnable(user.id))}
            disabled={busy}
            className="h-9 px-3 rounded-lg border-2 border-emerald-500 text-emerald-500 text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-500/10 transition disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
            Enable
          </button>
        )}

        {/* REJECTED */}
        {user.status === "rejected" && canManage && (
          <button
            onClick={wrap(async () => { onReinvite(user.email ?? "", user.full_name); })}
            disabled={busy}
            className="h-9 px-3 rounded-lg border-2 border-primary text-primary text-xs font-semibold flex items-center gap-1.5 hover:bg-primary/10 transition disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
            Reinvite
          </button>
        )}
      </div>
    </div>
  );
}

function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
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

  const inputCls = "w-full h-11 px-3 rounded-lg border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm space-y-4">
        <h2 className="font-bold text-lg text-foreground">Invite MAD Employee</h2>
        {done ? (
          <div className="text-center space-y-3 py-4">
            <Check className="h-10 w-10 text-emerald-500 mx-auto" />
            <p className="text-sm text-muted-foreground">
              Invite sent to <span className="font-semibold text-foreground">{email}</span>. They'll get an email with a login link.
            </p>
            <button onClick={onClose} className="text-sm text-primary font-semibold hover:underline">Done</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-foreground">Full name</span>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Sharma" className={inputCls} />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-foreground">Work email</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="priya@makeadiff.in" className={inputCls} />
            </label>
            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 h-11 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition">
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
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const all = await getAllUsers();
      setUsers(all);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((u) => { counts[u.status] = (counts[u.status] ?? 0) + 1; });
    return counts;
  }, [users]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((u) => { counts[u.role] = (counts[u.role] ?? 0) + 1; });
    return counts;
  }, [users]);

  const filtered = useMemo(() => {
    let result = users;
    if (statusFilter !== "all") result = result.filter((u) => u.status === statusFilter);
    if (roleFilter !== "all") result = result.filter((u) => u.role === roleFilter);
    return sortUsers(result);
  }, [users, statusFilter, roleFilter]);

  const currentRole = profile?.role ?? "cho";
  const canInvite = currentRole === "super_admin";

  const statusLabel = statusFilter === "all" ? "All statuses" : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1);
  const roleLabel = roleFilter === "all" ? "All roles" : ROLE_LABELS[roleFilter as UserRole];

  const handleApprove = async (id: string, role: UserRole) => {
    try {
      await approveUser(id, role);
      toast.success("User approved");
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.access_token) return;
        fetch("/api/notify-approval", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ userId: id }),
        }).catch(() => {});
      });
    } catch { toast.error("Something went wrong"); }
    await load();
  };

  const handleReject = async (id: string) => {
    try { await rejectUser(id); toast.success("Request rejected"); }
    catch { toast.error("Something went wrong"); }
    await load();
  };

  const handleDisable = async (id: string) => {
    try { await disableUser(id); toast.success("User disabled"); }
    catch { toast.error("Something went wrong"); }
    await load();
  };

  const handleEnable = async (id: string) => {
    try { await enableUser(id); toast.success("User enabled"); }
    catch { toast.error("Something went wrong"); }
    await load();
  };

  const handleRoleChange = async (id: string, role: UserRole) => {
    try { await updateUserRole(id, role); toast.success("Role updated"); }
    catch { toast.error("Something went wrong"); }
    await load();
  };

  const handleCancel = async (id: string) => {
    try { await cancelInvite(id); toast.success("Invite cancelled"); }
    catch { toast.error("Something went wrong"); }
    await load();
  };

  const handleResend = async (email: string, fullName: string) => {
    try { await resendInvite(email, fullName); toast.success("Invite resent"); }
    catch { toast.error("Something went wrong"); }
  };

  const handleReinvite = async (email: string, fullName: string) => {
    try { await resendInvite(email, fullName); toast.success("Invite sent"); }
    catch { toast.error("Something went wrong"); }
    await load();
  };

  return (
    <div className="px-5 md:px-10 py-6 md:py-10 w-full max-w-5xl mx-auto">
      <PageGuide pageKey="users" role={currentRole as UserRole} />

      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage team access and approvals.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={load} className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
          {canInvite && (
            <button
              onClick={() => setShowInvite(true)}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition"
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Invite</span>
            </button>
          )}
        </div>
      </div>

      {/* Status filter */}
      <div className="mb-3">
        <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-2">Status</p>
        <div className="flex gap-2 flex-wrap">
          <FilterPill label="All" count={users.length} active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
          <FilterPill label="Pending" count={statusCounts["pending"] ?? 0} active={statusFilter === "pending"} onClick={() => setStatusFilter("pending")} variant="pending" />
          <FilterPill label="Invited" count={statusCounts["invited"] ?? 0} active={statusFilter === "invited"} onClick={() => setStatusFilter("invited")} />
          <FilterPill label="Active" count={statusCounts["active"] ?? 0} active={statusFilter === "active"} onClick={() => setStatusFilter("active")} />
          <FilterPill label="Disabled" count={statusCounts["disabled"] ?? 0} active={statusFilter === "disabled"} onClick={() => setStatusFilter("disabled")} />
        </div>
      </div>

      {/* Role filter */}
      <div className="mb-4">
        <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-2">Role</p>
        <div className="flex gap-2 flex-wrap">
          <FilterPill label="All roles" active={roleFilter === "all"} onClick={() => setRoleFilter("all")} />
          <FilterPill label="MAD Employee" count={roleCounts["mad_employee"] ?? 0} active={roleFilter === "mad_employee"} onClick={() => setRoleFilter("mad_employee")} />
          <FilterPill label="CO" count={roleCounts["co"] ?? 0} active={roleFilter === "co"} onClick={() => setRoleFilter("co")} />
          <FilterPill label="CHO" count={roleCounts["cho"] ?? 0} active={roleFilter === "cho"} onClick={() => setRoleFilter("cho")} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        Showing <span className="font-semibold text-foreground">{filtered.length} {filtered.length === 1 ? "user" : "users"}</span>
        {" · "}{statusLabel}{" · "}{roleLabel}
      </p>

      <div className="bg-secondary/30 rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : loadError ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Failed to load users.</p>
            <button onClick={load} className="text-sm text-primary font-semibold hover:underline">Try again</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm text-muted-foreground">No users match these filters.</p>
            <button onClick={() => { setStatusFilter("all"); setRoleFilter("all"); }} className="text-sm text-primary font-semibold hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filtered.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                currentRole={currentRole as UserRole}
                onApprove={handleApprove}
                onReject={handleReject}
                onDisable={handleDisable}
                onEnable={handleEnable}
                onRoleChange={handleRoleChange}
                onCancel={handleCancel}
                onResend={handleResend}
                onReinvite={handleReinvite}
              />
            ))}
          </div>
        )}
      </div>

      {showInvite && (
        <InviteModal onClose={() => setShowInvite(false)} onInvited={load} />
      )}
    </div>
  );
}
