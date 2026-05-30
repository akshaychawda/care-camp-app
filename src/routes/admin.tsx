import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }

    const profile = await getProfile(session.user.id);

    if (!profile || profile.status === "pending") {
      throw redirect({ to: "/auth/pending" });
    }

    if (profile.status === "rejected" || profile.status === "disabled") {
      await supabase.auth.signOut();
      throw redirect({ to: "/login", search: { error: profile.status } });
    }

    return { profile };
  },
  component: AdminLayout,
});
