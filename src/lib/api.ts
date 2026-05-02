import { supabase } from './supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CampSession = {
  id: string
  city: string
  chapter: string
  date: string
  created_at: string
  parent_count: number
  card_count: number
}

export type Registration = {
  id: string
  session_id: string
  name: string
  phone: string
  city: string
  area: string
  child_name: string
  card_generated: boolean
  created_at: string
}

// ─── Camp Sessions ─────────────────────────────────────────────────────────────

export async function createSession(city: string, chapter: string, date: string): Promise<CampSession> {
  const { data, error } = await supabase
    .from('camp_sessions')
    .insert({ city, chapter, date })
    .select()
    .single()
  if (error) throw error
  return { ...data, parent_count: 0, card_count: 0 }
}

export async function getSessions(): Promise<CampSession[]> {
  const { data, error } = await supabase
    .from('camp_sessions')
    .select('*, parent_registrations(id, card_generated)')
    .order('date', { ascending: false })
  if (error) throw error

  return (data ?? []).map((s) => ({
    id: s.id,
    city: s.city,
    chapter: s.chapter,
    date: s.date,
    created_at: s.created_at,
    parent_count: s.parent_registrations?.length ?? 0,
    card_count: s.parent_registrations?.filter((r: { card_generated: boolean }) => r.card_generated).length ?? 0,
  }))
}

export async function getSession(id: string): Promise<{ session: CampSession; registrations: Registration[] }> {
  const { data, error } = await supabase
    .from('camp_sessions')
    .select('*, parent_registrations(*)')
    .eq('id', id)
    .single()
  if (error) throw error

  const registrations: Registration[] = data.parent_registrations ?? []
  const session: CampSession = {
    id: data.id,
    city: data.city,
    chapter: data.chapter,
    date: data.date,
    created_at: data.created_at,
    parent_count: registrations.length,
    card_count: registrations.filter((r) => r.card_generated).length,
  }
  return { session, registrations }
}

// ─── Registrations ─────────────────────────────────────────────────────────────

export async function registerParentAndChild(params: {
  sessionId: string
  parentName: string
  phone: string
  city: string
  area: string
  childName: string
  answers: string[]
}): Promise<Registration> {
  const { data: reg, error: regError } = await supabase
    .from('parent_registrations')
    .insert({
      session_id: params.sessionId,
      name: params.parentName,
      phone: params.phone,
      city: params.city,
      area: params.area,
      child_name: params.childName,
    })
    .select()
    .single()
  if (regError) throw regError

  const answers = params.answers.map((answer, i) => ({
    registration_id: reg.id,
    question_index: i,
    answer,
  }))
  const { error: ansError } = await supabase.from('child_answers').insert(answers)
  if (ansError) throw ansError

  return reg
}

export async function markCardGenerated(registrationId: string): Promise<void> {
  const { error } = await supabase
    .from('parent_registrations')
    .update({ card_generated: true })
    .eq('id', registrationId)
  if (error) throw error
}
