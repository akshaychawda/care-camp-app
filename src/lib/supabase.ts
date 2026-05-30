import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = "super_admin" | "mad_employee" | "co" | "cho";
export type UserStatus = "pending" | "active" | "rejected" | "disabled";

export type Profile = {
  id: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
};
