import { createFileRoute } from "@tanstack/react-router";
import { Clock, LogOut } from "lucide-react";
import { signOut } from "@/lib/auth";
import madLogo from "@/assets/mad-logo.png";

export const Route = createFileRoute("/auth/pending")({
  component: PendingPage,
});

function PendingPage() {
  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-2xl bg-sidebar-primary flex items-center justify-center">
            <img src={madLogo} alt="MAD" className="h-8 w-auto" />
          </div>
        </div>

        <div className="mx-auto h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center">
          <Clock className="h-8 w-8 text-amber-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground">Access request pending</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your request has been received. A MAD admin will review and approve your access shortly.
            You'll be able to sign in once approved.
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-semibold transition"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
