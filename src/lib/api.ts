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

export async function registerParentAndChild(params: {
  sessionId: string;
  parentName: string;
  phone: string;
  city: string;
  area: string;
  childName: string;
  answers: string[];
}): Promise<Registration> {
  const { data: reg, error: regError } = await supabase
    .from("parent_registrations")
    .insert({
      session_id: params.sessionId,
      name: params.parentName,
      phone: params.phone,
      city: params.city,
      area: params.area.trim().replace(/\b\w/g, (c) => c.toUpperCase()),
      child_name: params.childName,
    })
    .select()
    .single();
  if (regError) throw regError;

  const answers = params.answers.map((answer, i) => ({
    registration_id: reg.id,
    question_index: i,
    answer,
  }));
  const { error: ansError } = await supabase.from("child_answers").insert(answers);
  if (ansError) throw ansError;

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
  genderCounts: { gender: string; count: number }[];
};

export async function getParentStats(): Promise<ParentStats> {
  const { data, error } = await supabase
    .from("parent_registrations")
    .select("phone, card_generated, gender");
  if (error) throw error;
  const rows = data ?? [];
  const totalChildren = rows.length;
  const uniqueParents = new Set(rows.map((r) => r.phone)).size;
  const cardsGenerated = rows.filter((r) => r.card_generated).length;
  const genderMap: Record<string, number> = {};
  rows.forEach((r) => {
    const g = r.gender ?? "child";
    genderMap[g] = (genderMap[g] ?? 0) + 1;
  });
  const genderCounts = Object.entries(genderMap).map(([gender, count]) => ({ gender, count }));
  return { totalChildren, uniqueParents, cardsGenerated, genderCounts };
}

export async function getRegistrationsByWeek(weeks = 12): Promise<{ week: string; count: number }[]> {
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);
  const { data, error } = await supabase
    .from("parent_registrations")
    .select("created_at")
    .gte("created_at", since.toISOString());
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
  const { error } = await supabase
    .from("profiles")
    .update({ status: "active", role })
    .eq("id", id);
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
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) throw error;
}

async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
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
    full_name: (d.profiles as { full_name: string; role: UserRole } | null)?.full_name ?? "",
    role: (d.profiles as { full_name: string; role: UserRole } | null)?.role ?? "cho",
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
    const s = r.camp_sessions as { city: string; area: string; is_open: boolean; created_by: string };
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
