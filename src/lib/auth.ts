import { supabase, type Profile, type UserRole } from "./supabase";

export async function signInWithMagicLink(
  email: string,
  opts?: { full_name?: string; role?: UserRole },
) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: opts
        ? { full_name: opts.full_name ?? "", role: opts.role ?? "cho", status: "pending" }
        : undefined,
    },
  });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return data ?? null;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  return getProfile(session.user.id);
}
