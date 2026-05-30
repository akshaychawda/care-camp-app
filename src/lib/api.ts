import { supabase, type Profile, type UserRole } from "./supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CampSession = {
  id: string;
  city: string;
  chapter: string;
  date: string;
  created_at: string;
  is_open: boolean;
  parent_count: number;
  card_count: number;
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
    chapter: string;
    date: string;
    created_at: string;
    is_open: boolean;
  },
  regs: { card_generated: boolean }[],
): CampSession {
  return {
    id: raw.id,
    city: raw.city,
    chapter: raw.chapter,
    date: raw.date,
    created_at: raw.created_at,
    is_open: raw.is_open,
    parent_count: regs.length,
    card_count: regs.filter((r) => r.card_generated).length,
  };
}

export async function createSession(
  city: string,
  chapter: string,
  date: string,
): Promise<CampSession> {
  const { data, error } = await supabase
    .from("camp_sessions")
    .insert({ city, chapter, date })
    .select()
    .single();
  if (error) throw error;
  return toSession(data, []);
}

export async function getSessions(): Promise<CampSession[]> {
  const { data, error } = await supabase
    .from("camp_sessions")
    .select("*, parent_registrations(id, card_generated)")
    .order("date", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((s) => toSession(s, s.parent_registrations ?? []));
}

export async function getSession(
  id: string,
): Promise<{ session: CampSession; registrations: Registration[] }> {
  const { data, error } = await supabase
    .from("camp_sessions")
    .select("*, parent_registrations(*)")
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
      area: params.area,
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
  const { error } = await supabase.from("camp_sessions").update({ is_open: isOpen }).eq("id", id);
  if (error) throw error;
}

export async function getCampStatus(id: string): Promise<{ is_open: boolean }> {
  const { data, error } = await supabase
    .from("camp_sessions")
    .select("is_open")
    .eq("id", id)
    .single();
  if (error) throw error;
  return { is_open: data.is_open };
}

// ─── User Management ──────────────────────────────────────────────────────────

export async function getPendingUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getAllUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .neq("status", "pending")
    .order("created_at", { ascending: false });
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
