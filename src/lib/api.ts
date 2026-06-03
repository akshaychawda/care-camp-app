import { supabase, type Profile, type UserRole } from "./supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CampSession = {
  id: string;
  city: string;
  area: string;
  venue: string | null;
  date: string;
  created_at: string;
  closed_at: string | null;
  is_open: boolean;
  archived_at: string | null;
  parent_count: number;
  card_count: number;
  owner_name: string | null;
};

export type Registration = {
  id: string;
  session_id: string;
  name: string;
  phone: string;
  city: string;
  area: string;
  child_name: string;
  card_generated: boolean;
  created_at: string;
};

// ─── Camp Sessions ─────────────────────────────────────────────────────────────

function toSession(
  raw: {
    id: string;
    city: string;
    area: string;
    venue: string | null;
    date: string;
    created_at: string;
    closed_at: string | null;
    is_open: boolean;
    archived_at?: string | null;
    profiles?: { full_name: string } | null;
  },
  regs: { card_generated: boolean }[],
): CampSession {
  return {
    id: raw.id,
    city: raw.city,
    area: raw.area,
    venue: raw.venue ?? null,
    date: raw.date,
    created_at: raw.created_at,
    closed_at: raw.closed_at ?? null,
    is_open: raw.is_open,
    archived_at: raw.archived_at ?? null,
    parent_count: regs.length,
    card_count: regs.filter((r) => r.card_generated).length,
    owner_name: (raw.profiles as { full_name: string } | null)?.full_name ?? null,
  };
}

export async function createSession(
  city: string,
  area: string,
  venue: string,
  date: string,
): Promise<CampSession> {
  const {
    data: { session: authSession },
  } = await supabase.auth.getSession();
  const { data, error } = await supabase
    .from("camp_sessions")
    .insert({ city, area, venue: venue || null, date, created_by: authSession?.user.id })
    .select("*, profiles!created_by(full_name)")
    .single();
  if (error) throw error;
  return toSession(data, []);
}

export async function getSessions(): Promise<CampSession[]> {
  const { data, error } = await supabase
    .from("camp_sessions")
    .select("*, parent_registrations(id, card_generated), profiles!created_by(full_name)")
    .is("archived_at", null)
    .order("date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((s) => toSession(s, s.parent_registrations ?? []));
}

export async function getSession(
  id: string,
): Promise<{ session: CampSession; registrations: Registration[] }> {
  const { data, error } = await supabase
    .from("camp_sessions")
    .select("*, parent_registrations(*), profiles!created_by(full_name)")
    .eq("id", id)
    .single();
  if (error) throw error;
  const registrations: Registration[] = data.parent_registrations ?? [];
  return { session: toSession(data, registrations), registrations };
}

// ─── Registrations ─────────────────────────────────────────────────────────────

// Canonicalise an Indian mobile number to its bare 10 digits, so "+91 98765 43210",
// "098765 43210" and "9876543210" all dedup to the same family. (A8)
export function normalizePhone(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export async function registerParentAndChild(params: {
  sessionId: string;
  parentName: string;
  phone: string;
  city: string;
  area: string;
  consent: boolean;
  childName: string;
  answers: string[];
}): Promise<Registration> {
  const phone = normalizePhone(params.phone);
  const childName = params.childName.trim();

  // Soft duplicate guard (A9): if this phone already registered this child in this
  // camp, reuse that registration instead of creating a new row + a new (paid) image.
  // generate-image is idempotent, so the existing card is simply returned.
  const { data: existing } = await supabase
    .from("parent_registrations")
    .select("*")
    .eq("session_id", params.sessionId)
    .eq("phone", phone)
    .ilike("child_name", childName)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing;

  const { data: reg, error: regError } = await supabase
    .from("parent_registrations")
    .insert({
      session_id: params.sessionId,
      name: params.parentName,
      phone,
      city: params.city,
      area: params.area.trim().replace(/\b\w/g, (c) => c.toUpperCase()),
      consent_at: params.consent ? new Date().toISOString() : null,
      child_name: childName,
    })
    .select()
    .single();
  if (regError) throw regError;

  const answers = params.answers.map((answer, i) => ({
    registration_id: reg.id,
    question_index: i,
    answer,
  }));
  // Non-fatal: child_answers is a write-only analytics table that nothing in the
  // app reads back, and the dream card is generated from in-memory data — not from
  // these rows. So a failure here (e.g. an RLS gap on the anon key) must NOT block
  // the parent's card on camp day. Log it and continue.
  const { error: ansError } = await supabase.from("child_answers").insert(answers);
  if (ansError) {
    console.error("child_answers insert failed (non-fatal):", ansError);
  }

  return reg;
}

export async function markCardGenerated(registrationId: string): Promise<void> {
  const { error } = await supabase
    .from("parent_registrations")
    .update({ card_generated: true })
    .eq("id", registrationId);
  if (error) throw error;
}

export async function toggleCampStatus(id: string, isOpen: boolean): Promise<void> {
  const update: { is_open: boolean; closed_at?: string } = { is_open: isOpen };
  if (!isOpen) update.closed_at = new Date().toISOString();
  const { error } = await supabase.from("camp_sessions").update(update).eq("id", id);
  if (error) throw error;
}

export async function updateSession(
  id: string,
  fields: { city: string; area: string; venue: string; date: string },
): Promise<void> {
  const { error } = await supabase
    .from("camp_sessions")
    .update({
      city: fields.city,
      area: fields.area.trim().replace(/\b\w/g, (c) => c.toUpperCase()),
      venue: fields.venue || null,
      date: fields.date,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function archiveSession(id: string): Promise<void> {
  const { error } = await supabase
    .from("camp_sessions")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function unarchiveSession(id: string): Promise<void> {
  const { error } = await supabase.from("camp_sessions").update({ archived_at: null }).eq("id", id);
  if (error) throw error;
}

export async function getCampStatus(id: string): Promise<{ is_open: boolean; city: string }> {
  const { data, error } = await supabase
    .from("camp_sessions")
    .select("is_open, city")
    .eq("id", id)
    .single();
  if (error) throw error;
  return { is_open: data.is_open, city: data.city ?? "" };
}

// ─── Overview Stats ───────────────────────────────────────────────────────────

export type ParentStats = {
  totalChildren: number;
  uniqueParents: number;
  cardsGenerated: number;
};

export async function getParentStats(): Promise<ParentStats> {
  const { data, error } = await supabase
    .from("parent_registrations")
    .select("phone, card_generated, camp_sessions!inner(archived_at)")
    .is("camp_sessions.archived_at", null);
  if (error) throw error;
  const rows = data ?? [];
  return {
    totalChildren: rows.length,
    // Normalize when deduping so legacy raw + new canonical phones don't double-count. (A8)
    uniqueParents: new Set(rows.map((r) => normalizePhone(r.phone))).size,
    cardsGenerated: rows.filter((r) => r.card_generated).length,
  };
}

// Reach scoped to a specific set of camps — used so CO/CHO Overview tiles reflect
// only their own camps. We filter explicitly by accessible session ids (which come
// from the RLS-scoped getSessions), so this is correct regardless of whether
// parent_registrations itself has row-level security. (A12)
export async function getReachForSessions(sessionIds: string[]): Promise<ParentStats> {
  if (sessionIds.length === 0) {
    return { totalChildren: 0, uniqueParents: 0, cardsGenerated: 0 };
  }
  const { data, error } = await supabase
    .from("parent_registrations")
    .select("phone, card_generated")
    .in("session_id", sessionIds);
  if (error) throw error;
  const rows = data ?? [];
  return {
    totalChildren: rows.length,
    uniqueParents: new Set(rows.map((r) => normalizePhone(r.phone))).size,
    cardsGenerated: rows.filter((r) => r.card_generated).length,
  };
}

export async function getRegistrationsByWeek(
  weeks = 12,
  sessionIds?: string[],
): Promise<{ week: string; count: number }[]> {
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);
  let query = supabase
    .from("parent_registrations")
    .select("created_at, camp_sessions!inner(archived_at)")
    .is("camp_sessions.archived_at", null)
    .gte("created_at", since.toISOString());
  if (sessionIds) query = query.in("session_id", sessionIds);
  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];

  const buckets: Record<string, number> = {};
  for (let i = weeks - 1; i >= 0; i--) {
    const key = `W${weeks - i}`;
    buckets[key] = 0;
  }

  rows.forEach((r) => {
    const created = new Date(r.created_at);
    const msDiff = Date.now() - created.getTime();
    const weeksAgo = Math.floor(msDiff / (7 * 24 * 60 * 60 * 1000));
    if (weeksAgo < weeks) {
      const key = `W${weeks - weeksAgo}`;
      if (buckets[key] !== undefined) buckets[key]++;
    }
  });

  return Object.entries(buckets).map(([week, count]) => ({ week, count }));
}

export async function getLiveCamps(): Promise<{ id: string; city: string; area: string }[]> {
  const { data, error } = await supabase
    .from("camp_sessions")
    .select("id, city, area")
    .eq("is_open", true)
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  if (error) return [];
  return data ?? [];
}

// ─── User Management ──────────────────────────────────────────────────────────

export async function getAllUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getPendingCount(): Promise<number> {
  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) return 0;
  return count ?? 0;
}

export async function approveUser(id: string, role: UserRole): Promise<void> {
  const { error } = await supabase.from("profiles").update({ status: "active", role }).eq("id", id);
  if (error) throw error;
}

export async function rejectUser(id: string): Promise<void> {
  const { error } = await supabase.from("profiles").update({ status: "rejected" }).eq("id", id);
  if (error) throw error;
}

export async function disableUser(id: string): Promise<void> {
  const { error } = await supabase.from("profiles").update({ status: "disabled" }).eq("id", id);
  if (error) throw error;
}

export async function enableUser(id: string): Promise<void> {
  const { error } = await supabase.from("profiles").update({ status: "active" }).eq("id", id);
  if (error) throw error;
}

export async function updateUserRole(id: string, role: UserRole): Promise<void> {
  // .select() so we can confirm the write actually landed. Under RLS, an UPDATE
  // that the policy filters out returns success with zero rows (silent no-op),
  // which would otherwise look like it worked. Verify the returned row reflects
  // the new role and surface a clear error if the database blocked it.
  const { data, error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", id)
    .select("id, role");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(
      "The database blocked this change (no row updated). A Supabase RLS policy on 'profiles' likely prevents setting this role.",
    );
  }
  if (data[0].role !== role) {
    throw new Error(`Role did not change — database returned '${data[0].role}'.`);
  }
}

async function getAuthToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function cancelInvite(userId: string): Promise<void> {
  const token = await getAuthToken();
  const res = await fetch("/api/cancel-invite", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to cancel invite");
  }
}

export async function resendInvite(email: string, fullName: string): Promise<void> {
  const token = await getAuthToken();
  const res = await fetch("/api/invite-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ email, full_name: fullName }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to resend invite");
  }
}

// ─── Camp Collaborators ────────────────────────────────────────────────────────

export type Collaborator = {
  user_id: string;
  full_name: string;
  role: UserRole;
};

export async function getCampCollaborators(campId: string): Promise<Collaborator[]> {
  const { data, error } = await supabase
    .from("camp_collaborators")
    .select("user_id, profiles(full_name, role)")
    .eq("camp_session_id", campId);
  if (error) throw error;
  return (data ?? []).map((d) => ({
    user_id: d.user_id,
    full_name:
      (d.profiles as unknown as { full_name: string; role: UserRole } | null)?.full_name ?? "",
    role: (d.profiles as unknown as { full_name: string; role: UserRole } | null)?.role ?? "cho",
  }));
}

export async function addCampCollaborator(campId: string, userId: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const { error } = await supabase.from("camp_collaborators").insert({
    camp_session_id: campId,
    user_id: userId,
    granted_by: session?.user.id,
  });
  if (error) throw error;
}

export async function removeCampCollaborator(campId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("camp_collaborators")
    .delete()
    .eq("camp_session_id", campId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function getShareableUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", "active")
    .in("role", ["co", "cho"])
    .order("full_name");
  if (error) throw error;
  return data ?? [];
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getRegistrationTimeline(filters: {
  city?: string;
  area?: string;
  isOpen?: boolean;
  ownerId?: string;
}): Promise<{ date: string; count: number }[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from("parent_registrations")
    .select("created_at, camp_sessions!inner(city, area, is_open, created_by)")
    .gte("created_at", thirtyDaysAgo.toISOString());

  if (error) throw error;

  const filtered = (data ?? []).filter((r) => {
    const s = r.camp_sessions as unknown as {
      city: string;
      area: string;
      is_open: boolean;
      created_by: string;
    };
    if (filters.city && s.city !== filters.city) return false;
    if (filters.area && s.area !== filters.area) return false;
    if (filters.isOpen !== undefined && s.is_open !== filters.isOpen) return false;
    if (filters.ownerId && s.created_by !== filters.ownerId) return false;
    return true;
  });

  // Build a map for the last 30 days with zero counts
  const byDate: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    byDate[d.toISOString().slice(0, 10)] = 0;
  }
  for (const r of filtered) {
    const date = r.created_at.slice(0, 10);
    if (date in byDate) byDate[date]++;
  }

  return Object.entries(byDate).map(([date, count]) => ({ date, count }));
}

export async function getCampOwners(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", "active")
    .in("role", ["co", "mad_employee", "super_admin"])
    .order("full_name");
  if (error) throw error;
  return data ?? [];
}
