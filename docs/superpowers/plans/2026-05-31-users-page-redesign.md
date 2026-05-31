# Users Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-tab Users page with a single unified list filtered by status pills and role pills, with sort order (pending first) and contextual actions per status.

**Architecture:** All users are fetched in one `getAllUsers()` call. Filtering and sorting happen client-side in the component. Three separate row components (PendingRow, InvitedRow, UserRow) are replaced with one unified `UserRow` that renders contextual actions based on `user.status`. Pill counts are computed from the full unfiltered array so they stay stable as filters change.

**Tech Stack:** React, TypeScript, TanStack Router, Supabase, Tailwind CSS, Sonner (toasts), Lucide icons.

---

## File Map

| File | Change |
|------|--------|
| `src/lib/api.ts` | Update `getAllUsers()` to return all statuses; remove `getPendingUsers()` |
| `src/routes/admin.users.tsx` | Full redesign — remove tabs, add filter pills, unified UserRow |

---

### Task 1: Update `getAllUsers()` in api.ts

**Files:**
- Modify: `src/lib/api.ts`

- [ ] **Step 1: Update `getAllUsers` to return all statuses**

In `src/lib/api.ts`, replace:

```typescript
export async function getAllUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .neq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
```

With:

```typescript
export async function getAllUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
```

- [ ] **Step 2: Remove `getPendingUsers`**

Delete the entire `getPendingUsers` function (lines ~165–173):

```typescript
// DELETE THIS ENTIRE FUNCTION:
export async function getPendingUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
```

- [ ] **Step 3: Build and confirm no TypeScript errors**

```bash
cd ~/Projects/care-camp-app && npm run build 2>&1 | tail -5
```

Expected: `✓ built in X.XXs` (errors expected at this stage only if something else imports `getPendingUsers` — fix any such imports before proceeding)

- [ ] **Step 4: Commit**

```bash
cd ~/Projects/care-camp-app && git add src/lib/api.ts && git commit -m "refactor: getAllUsers returns all statuses; remove getPendingUsers"
```

---

### Task 2: Rewrite admin.users.tsx — filter state + sorting

**Files:**
- Modify: `src/routes/admin.users.tsx`

This task replaces the entire file. Do it in stages.

- [ ] **Step 1: Replace imports and add sort helper**

Replace the top of `src/routes/admin.users.tsx` (imports + constants through `STATUS_BADGE`) with:

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageGuide } from "@/components/admin/PageGuide";
import { Check, X, UserCheck, UserX, RefreshCw, UserPlus, Loader2, Copy } from "lucide-react";
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

const ROLE_BADGE: Record<UserRole, string> = {
  super_admin: "bg-purple-500/15 text-purple-400",
  mad_employee: "bg-blue-500/15 text-blue-400",
  co: "bg-violet-500/15 text-violet-400",
  cho: "bg-pink-500/15 text-pink-400",
};

const STATUS_BADGE: Record<string, string> = {
  invited: "bg-blue-500/15 text-blue-400",
  pending: "bg-amber-500/15 text-amber-500",
  active: "bg-emerald-500/15 text-emerald-400",
  disabled: "bg-red-500/15 text-red-400",
  rejected: "bg-red-500/15 text-red-400",
};

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  invited: 1,
  active: 2,
  disabled: 3,
  rejected: 4,
};

const AVATAR_COLOR: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600",
  invited: "bg-blue-500/15 text-blue-500",
  active: "bg-emerald-500/15 text-emerald-600",
  disabled: "bg-red-500/15 text-red-500",
  rejected: "bg-red-500/15 text-red-400",
};

function sortUsers(users: Profile[]): Profile[] {
  return [...users].sort((a, b) => {
    const orderDiff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
    if (orderDiff !== 0) return orderDiff;
    return (a.full_name || "").localeCompare(b.full_name || "");
  });
}
```

- [ ] **Step 2: Build to check for type errors so far**

```bash
cd ~/Projects/care-camp-app && npm run build 2>&1 | grep -E "error TS|✓ built"
```

Expected: errors about missing components (fine at this stage) or `✓ built`.

- [ ] **Step 3: Commit partial**

```bash
cd ~/Projects/care-camp-app && git add src/routes/admin.users.tsx && git commit -m "refactor(users): update imports, add sort helper and badge constants"
```

---

### Task 3: Add shared UI primitives and RoleBadge

**Files:**
- Modify: `src/routes/admin.users.tsx`

- [ ] **Step 1: Add RoleBadge and helper components after the constants**

Append after the `sortUsers` function:

```typescript
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
  const activeClass = active ? "bg-primary text-primary-foreground border-primary" : variant === "pending" ? "border-amber-400 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground";
  return (
    <button
      onClick={onClick}
      className={`h-8 px-3 rounded-full border-2 text-xs font-semibold transition flex items-center gap-1.5 ${activeClass}`}
    >
      {label}
      {count !== undefined && (
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${active ? "bg-white/20" : "bg-secondary text-muted-foreground"}`}>
          {count}
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd ~/Projects/care-camp-app && npm run build 2>&1 | grep -E "error TS|✓ built"
```

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/care-camp-app && git add src/routes/admin.users.tsx && git commit -m "refactor(users): add Avatar, StatusBadge, FilterPill shared components"
```

---

### Task 4: Build the unified UserRow component

**Files:**
- Modify: `src/routes/admin.users.tsx`

- [ ] **Step 1: Add the unified UserRow component**

Append after the `FilterPill` component:

```typescript
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
      {/* Left: avatar + info */}
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

      {/* Right: actions */}
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
              onClick={wrap(() => { onResend(user.email ?? "", user.full_name); return Promise.resolve(); })}
              disabled={busy}
              className="h-9 px-3 rounded-lg border-2 border-primary text-primary text-xs font-semibold flex items-center gap-1.5 hover:bg-primary/10 transition disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Resend
            </button>
            <button
              onClick={wrap(() => { onCancel(user.id); return Promise.resolve(); })}
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
            onClick={wrap(() => { onReinvite(user.email ?? "", user.full_name); return Promise.resolve(); })}
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
```

- [ ] **Step 2: Build check**

```bash
cd ~/Projects/care-camp-app && npm run build 2>&1 | grep -E "error TS|✓ built"
```

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/care-camp-app && git add src/routes/admin.users.tsx && git commit -m "feat(users): unified UserRow with contextual actions by status"
```

---

### Task 5: Build the InviteModal (unchanged, keep as-is)

The `InviteModal` component stays the same. No changes needed. Skip to Task 6.

---

### Task 6: Rewrite UsersPage with filter pills + unified list

**Files:**
- Modify: `src/routes/admin.users.tsx`

- [ ] **Step 1: Replace the UsersPage component**

Replace the entire `function UsersPage()` (from `function UsersPage()` to end of file, excluding `InviteModal`) with:

```typescript
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

  // Counts computed from full unfiltered list
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

  // Filtered + sorted
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
    <div className="px-5 md:px-10 py-6 md:py-10 w-full">
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
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status</p>
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
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Role</p>
        <div className="flex gap-2 flex-wrap">
          <FilterPill label="All roles" active={roleFilter === "all"} onClick={() => setRoleFilter("all")} />
          <FilterPill label="MAD Employee" count={roleCounts["mad_employee"] ?? 0} active={roleFilter === "mad_employee"} onClick={() => setRoleFilter("mad_employee")} />
          <FilterPill label="CO" count={roleCounts["co"] ?? 0} active={roleFilter === "co"} onClick={() => setRoleFilter("co")} />
          <FilterPill label="CHO" count={roleCounts["cho"] ?? 0} active={roleFilter === "cho"} onClick={() => setRoleFilter("cho")} />
        </div>
      </div>

      {/* Result summary */}
      <p className="text-xs text-muted-foreground mb-3">
        Showing <span className="font-semibold text-foreground">{filtered.length} {filtered.length === 1 ? "user" : "users"}</span>
        {" · "}{statusLabel}{" · "}{roleLabel}
      </p>

      {/* List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
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
          <div className="divide-y divide-border">
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
```

- [ ] **Step 2: Remove the old PendingRow, InvitedRow, and UserRow components**

Delete these three component functions entirely from the file — they are fully replaced by the new unified `UserRow` above. Keep only: imports, constants, `sortUsers`, `RoleBadge`, `StatusBadge`, `Avatar`, `FilterPill`, new `UserRow`, `InviteModal`, `UsersPage`.

- [ ] **Step 3: Build and confirm clean**

```bash
cd ~/Projects/care-camp-app && npm run build 2>&1 | tail -8
```

Expected: `✓ built in X.XXs` with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
cd ~/Projects/care-camp-app && git add src/routes/admin.users.tsx && git commit -m "feat(users): unified list with status+role filter pills, pending-first sort"
```

- [ ] **Step 5: Push and verify deploy**

```bash
cd ~/Projects/care-camp-app && git push origin main
```

Then check `https://mad-care-camps.vercel.app/admin/users` after Vercel deploys (~1 min):
- Status pills show correct counts
- Pending users appear at top
- Filtering "CO + Pending" shows only pending COs
- Approve button disabled until role selected
- Invited users show Resend + Cancel
- Active users show Change role + Disable
- "No users match these filters." appears when filter has no results, with working Clear filters link
