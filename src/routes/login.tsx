import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import { signInWithMagicLink } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import madLogo from "@/assets/mad-logo.png";

type SearchParams = { redirect?: string; error?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
    error: typeof s.error === "string" ? s.error : undefined,
  }),
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) throw redirect({ to: "/admin" });
  },
  component: LoginPage,
});

const ERROR_MESSAGES: Record<string, string> = {
  rejected: "Your access request was not approved. Contact MAD admin for help.",
  disabled: "Your account has been disabled. Contact MAD admin for help.",
};

function LoginPage() {
  const { error: errorParam } = Route.useSearch();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "register") {
        await signInWithMagicLink(email, { full_name: fullName });
      } else {
        await signInWithMagicLink(email);
      }
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Shell>
        <div className="text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            We sent a magic link to <span className="font-semibold text-foreground">{email}</span>.
            Click it to sign in — the link expires in 1 hour.
          </p>
          <button
            onClick={() => setSent(false)}
            className="text-sm text-primary font-semibold hover:underline"
          >
            Use a different email
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-xl font-bold text-foreground text-center">
        {mode === "signin" ? "Sign in to MAD Admin" : "Request access"}
      </h1>

      {(errorParam || error) && (
        <div className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg">
          {errorParam ? ERROR_MESSAGES[errorParam] : error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        {mode === "register" && (
          <Field label="Your full name">
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Priya Sharma"
              className={inputCls}
            />
          </Field>
        )}

        <Field label="Work email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@makeadiff.in"
            className={inputCls}
          />
        </Field>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Mail className="h-4 w-4" />
              {mode === "signin" ? "Send magic link" : "Request access"}
            </>
          )}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "signin" ? (
          <>
            First time?{" "}
            <button
              onClick={() => setMode("register")}
              className="text-primary font-semibold hover:underline"
            >
              Request access
            </button>
          </>
        ) : (
          <>
            Already have access?{" "}
            <button
              onClick={() => setMode("signin")}
              className="text-primary font-semibold hover:underline"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-2xl bg-sidebar-primary flex items-center justify-center">
            <img src={madLogo} alt="MAD" className="h-8 w-auto" />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full h-11 px-3 rounded-lg border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-ring";
