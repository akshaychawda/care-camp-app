import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/auth";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let done = false;
    const route = async (session: { user: { id: string } } | null) => {
      if (done || !session) return;
      done = true;
      const profile = await getProfile(session.user.id);

      if (!profile || profile.status === "pending") {
        navigate({ to: "/auth/pending", replace: true });
      } else if (profile.status === "active") {
        navigate({ to: "/admin", replace: true });
      } else if (profile.status === "invited") {
        // Hand-picked invite — activate on first sign-in, no approval needed
        await supabase.from("profiles").update({ status: "active" }).eq("id", session.user.id);
        navigate({ to: "/admin", replace: true });
      } else {
        await supabase.auth.signOut();
        navigate({ to: "/login", search: { error: profile.status }, replace: true });
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") route(session);
    });

    // Fallback: if the user is already signed in when they land here (e.g. an old
    // magic link), SIGNED_IN may never fire — route off the existing session so we
    // don't hang on "Signing you in…" forever.
    supabase.auth.getSession().then(({ data: { session } }) => route(session));

    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </div>
  );
}
