import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Download, Sparkles, Loader2 } from "lucide-react";
import madLogo from "@/assets/mad-logo.png";
import dreamCard from "@/assets/dream-card.jpg";
import { registerParentAndChild } from "@/lib/api";

type Step =
  | "no-session"
  | "welcome"
  | "parent"
  | "child"
  | "q1" | "q2" | "q3" | "q4" | "q5"
  | "loading"
  | "reveal"
  | "next";

const QUESTIONS = [
  { key: "q1", label: "What do you want to be when you grow up?", hint: "Doctor, cricketer, teacher, astronaut… anything!" },
  { key: "q2", label: "What is your favourite subject or activity?", hint: "Maths, drawing, dancing, football…" },
  { key: "q3", label: "What problem would you like to fix in the world?", hint: "Pollution, hunger, making people happy…" },
  { key: "q4", label: "Who is someone you look up to?", hint: "A family member, a sports star, a character from a story…" },
  { key: "q5", label: "Describe yourself in one word.", hint: "Brave, curious, funny, kind…" },
] as const;

type FormData = {
  parentName: string;
  phone: string;
  city: string;
  area: string;
  childName: string;
  q1: string; q2: string; q3: string; q4: string; q5: string;
};

const EMPTY: FormData = {
  parentName: "", phone: "", city: "", area: "",
  childName: "", q1: "", q2: "", q3: "", q4: "", q5: "",
};

const ORDER: Step[] = ["welcome", "parent", "child", "q1", "q2", "q3", "q4", "q5", "loading", "reveal", "next"];

function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center justify-center px-5 py-2 rounded-2xl bg-foreground ${className}`}>
      <img src={madLogo} alt="MAD — Make A Difference" className="h-8 w-auto" />
    </div>
  );
}

function Header({ onBack, progress }: { onBack?: () => void; progress?: { current: number; total: number } }) {
  return (
    <div className="px-5 pt-5 pb-2 flex items-center gap-3 min-h-[64px]">
      {onBack ? (
        <button
          onClick={onBack}
          aria-label="Back"
          className="h-11 w-11 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center active:scale-95 transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      ) : <div className="h-11 w-11" />}
      {progress ? (
        <div className="flex-1 flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-gradient-warm rounded-full transition-all duration-500"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-muted-foreground tabular-nums">
            {progress.current} of {progress.total}
          </span>
        </div>
      ) : <div className="flex-1" />}
      <div className="h-11 w-11" />
    </div>
  );
}

function PrimaryButton({ children, disabled, onClick, variant = "primary", type = "button" }: {
  children: React.ReactNode; disabled?: boolean; onClick?: () => void;
  variant?: "primary" | "whatsapp" | "outline";
  type?: "button" | "submit";
}) {
  const base = "w-full h-14 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100";
  const styles = {
    primary: "bg-gradient-warm text-primary-foreground shadow-warm",
    whatsapp: "bg-whatsapp text-whatsapp-foreground shadow-warm",
    outline: "border-2 border-primary/30 text-primary bg-transparent",
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", autoFocus }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-foreground/80 mb-2 px-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full h-14 px-4 rounded-2xl bg-input border-2 border-transparent focus:border-primary focus:bg-card outline-none text-lg transition placeholder:text-muted-foreground/60"
      />
    </label>
  );
}

export function DreamFlow({ sessionId }: { sessionId?: string }) {
  const [step, setStep] = useState<Step>(sessionId ? "welcome" : "no-session");
  const [data, setData] = useState<FormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const idx = ORDER.indexOf(step);
  const go = (s: Step) => setStep(s);
  const back = () => setStep(ORDER[Math.max(idx - 1, 0)]);

  // Save to Supabase when all questions are answered and we enter loading
  const submitAndAdvance = async () => {
    if (!sessionId) return;
    setSaving(true);
    setSaveError(null);
    try {
      await registerParentAndChild({
        sessionId,
        parentName: data.parentName,
        phone: data.phone,
        city: data.city,
        area: data.area,
        childName: data.childName,
        answers: [data.q1, data.q2, data.q3, data.q4, data.q5],
      });
      go("loading");
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Loading auto-advance to reveal
  useEffect(() => {
    if (step === "loading") {
      const t = setTimeout(() => setStep("reveal"), 3000);
      return () => clearTimeout(t);
    }
  }, [step]);

  const update = <K extends keyof FormData>(k: K, v: FormData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const showBack = step !== "welcome" && step !== "loading" && step !== "no-session";
  const qIndex = step.startsWith("q") ? Number(step.slice(1)) : 0;
  const progress = qIndex ? { current: qIndex, total: 5 } : undefined;

  return (
    <div className="flex flex-col min-h-screen md:min-h-[860px] animate-float-up" key={step}>
      <Header onBack={showBack ? back : undefined} progress={progress} />

      <div className="flex-1 flex flex-col px-6 pb-8">
        {step === "no-session" && <NoSession />}

        {step === "welcome" && <Welcome onStart={() => go("parent")} />}

        {step === "parent" && (
          <ScreenForm
            heading="First, a little about you"
            canContinue={!!(data.parentName && data.phone && data.area)}
            onContinue={() => go("child")}
          >
            <Field label="Full Name" value={data.parentName} onChange={(v) => update("parentName", v)} placeholder="Your name" autoFocus />
            <Field label="Phone Number" value={data.phone} onChange={(v) => update("phone", v)} placeholder="10-digit mobile" type="tel" />
            <Field label="City" value={data.city} onChange={(v) => update("city", v)} placeholder="e.g. Pune" />
            <Field label="Neighbourhood / Area" value={data.area} onChange={(v) => update("area", v)} placeholder="e.g. Koregaon Park, Baner" />
          </ScreenForm>
        )}

        {step === "child" && (
          <ScreenForm
            heading="Now, tell us about your child"
            canContinue={!!data.childName}
            onContinue={() => go("q1")}
          >
            <Field label="Child's First Name" value={data.childName} onChange={(v) => update("childName", v)} placeholder="Their name" autoFocus />
          </ScreenForm>
        )}

        {QUESTIONS.map((q, i) => {
          const isLast = i === QUESTIONS.length - 1;
          return step === q.key ? (
            <Question
              key={q.key}
              heading={q.label}
              hint={q.hint}
              value={data[q.key as keyof FormData] as string}
              onChange={(v) => update(q.key as keyof FormData, v)}
              onNext={isLast ? submitAndAdvance : () => go(QUESTIONS[i + 1].key as Step)}
              isLast={isLast}
              saving={isLast ? saving : false}
              error={isLast ? saveError : null}
            />
          ) : null;
        })}

        {step === "loading" && <Loading childName={data.childName || "your child"} />}

        {step === "reveal" && (
          <Reveal
            childName={data.childName || "Your child"}
            dream={data.q1 || "something wonderful"}
            problem={data.q3 || "the world"}
            onNext={() => go("next")}
          />
        )}

        {step === "next" && (
          <NextChild
            childName={data.childName || "Your child"}
            onNext={() => {
              // Keep session context but reset all form data
              setData({ ...EMPTY });
              setSaveError(null);
              go("parent");
            }}
          />
        )}
      </div>
    </div>
  );
}

function NoSession() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
      <Logo className="h-14 mb-10" />
      <h1 className="text-2xl font-bold text-foreground">Invalid link</h1>
      <p className="mt-3 text-base text-muted-foreground max-w-[280px]">
        This link is not connected to a valid camp session. Please ask your volunteer for the correct link.
      </p>
    </div>
  );
}

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center text-center pt-6">
      <Logo className="h-14 mb-12" />
      <div className="relative my-6">
        <div className="absolute inset-0 bg-gradient-warm rounded-full blur-3xl opacity-30 animate-pulse-glow" />
        <div className="relative h-32 w-32 rounded-full bg-gradient-warm flex items-center justify-center shadow-warm">
          <Sparkles className="h-14 w-14 text-primary-foreground" strokeWidth={2.2} />
        </div>
      </div>
      <h1 className="text-4xl font-extrabold mt-8 leading-tight">
        Welcome to <span className="text-primary">Care Camps</span>
      </h1>
      <p className="mt-4 text-lg text-muted-foreground max-w-[300px]">
        Answer a few questions and we'll create something magical for your child.
      </p>
      <div className="flex-1" />
      <div className="w-full pt-8">
        <PrimaryButton onClick={onStart}>
          Let's Begin <ArrowRight className="h-5 w-5" />
        </PrimaryButton>
      </div>
    </div>
  );
}

function ScreenForm({ heading, children, canContinue, onContinue }: {
  heading: string; children: React.ReactNode; canContinue: boolean; onContinue: () => void;
}) {
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (canContinue) onContinue(); }}
      className="flex-1 flex flex-col"
    >
      <h1 className="text-3xl font-bold leading-tight mb-8 mt-2">{heading}</h1>
      <div className="space-y-5">{children}</div>
      <div className="flex-1" />
      <div className="pt-8">
        <PrimaryButton type="submit" disabled={!canContinue}>
          Continue <ArrowRight className="h-5 w-5" />
        </PrimaryButton>
      </div>
    </form>
  );
}

function Question({ heading, hint, value, onChange, onNext, isLast, saving, error }: {
  heading: string; hint: string; value: string; onChange: (v: string) => void;
  onNext: () => void; isLast: boolean; saving?: boolean; error?: string | null;
}) {
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (value.trim() && !saving) onNext(); }}
      className="flex-1 flex flex-col pt-4"
    >
      <h2 className="text-3xl font-bold leading-tight">{heading}</h2>
      <p className="mt-3 text-base text-muted-foreground">{hint}</p>
      <div className="mt-8">
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer…"
          className="w-full h-16 px-5 rounded-2xl bg-input border-2 border-transparent focus:border-primary focus:bg-card outline-none text-xl transition placeholder:text-muted-foreground/60"
        />
      </div>
      {error && (
        <p className="mt-3 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
      )}
      <div className="flex-1" />
      <div className="pt-8">
        <PrimaryButton type="submit" disabled={!value.trim() || !!saving}>
          {saving ? (
            <><Loader2 className="h-5 w-5 animate-spin" /> Saving…</>
          ) : (
            <>{isLast ? "Create My Card" : "Next"} <ArrowRight className="h-5 w-5" /></>
          )}
        </PrimaryButton>
      </div>
    </form>
  );
}

function Loading({ childName }: { childName: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <div className="relative mb-12">
        <div className="absolute inset-0 bg-gradient-warm rounded-full blur-3xl opacity-60 animate-pulse-glow" />
        <div className="relative h-40 w-40 rounded-full bg-gradient-warm flex items-center justify-center shadow-warm animate-pulse-glow">
          <Sparkles className="h-20 w-20 text-primary-foreground" strokeWidth={2} />
        </div>
      </div>
      <h2 className="text-3xl font-bold leading-tight max-w-[320px]">
        We're painting <span className="text-primary">{childName}</span>'s dream…
      </h2>
      <p className="mt-4 text-base text-muted-foreground">This will just take a moment ✨</p>
    </div>
  );
}

function Reveal({ childName, dream, problem, onNext }: {
  childName: string; dream: string; problem: string; onNext: () => void;
}) {
  const caption = dream && problem
    ? `${childName} dreams of becoming a ${dream.toLowerCase()} and making ${problem.toLowerCase()} better.`
    : `${childName} dreams of becoming a ${(dream || "changemaker").toLowerCase()}.`;

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = dreamCard;
    a.download = `${childName}-dream-card.jpg`;
    a.click();
  };

  return (
    <div className="flex flex-col">
      <h2 className="text-2xl font-bold mb-4 text-center">{childName}'s Dream Card</h2>

      <div className="relative rounded-3xl overflow-hidden shadow-card bg-gradient-card">
        <img
          src={dreamCard}
          alt={`${childName}'s dream illustration`}
          width={1024}
          height={1024}
          className="w-full aspect-square object-cover"
        />
        <div className="absolute top-3 right-3 bg-foreground/90 backdrop-blur rounded-xl px-3 py-2 flex items-center">
          <img src={madLogo} alt="MAD" className="h-6 w-auto object-contain" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-5 pt-12">
          <p className="font-display italic text-white text-lg leading-snug">
            "{caption}"
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <PrimaryButton variant="outline" onClick={handleDownload}>
          <Download className="h-5 w-5" /> Download Card
        </PrimaryButton>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-4 px-4">
        Save or screenshot this card to share with your family! 🌟
      </p>

      <div className="mt-5">
        <PrimaryButton onClick={onNext}>
          Next Child <ArrowRight className="h-5 w-5" />
        </PrimaryButton>
      </div>
    </div>
  );
}

function NextChild({ childName, onNext }: { childName: string; onNext: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <div className="relative mb-10">
        <div className="absolute inset-0 bg-whatsapp/30 rounded-full blur-3xl" />
        <div className="relative h-32 w-32 rounded-full bg-whatsapp flex items-center justify-center shadow-warm text-5xl">
          🌟
        </div>
      </div>
      <h2 className="text-3xl font-bold leading-tight max-w-[320px]">
        Done! <span className="text-primary">{childName}</span>'s card is ready.
      </h2>
      <p className="mt-4 text-base text-muted-foreground">
        Thank you for being part of this moment.
      </p>
      <div className="flex-1" />
      <div className="w-full pt-8">
        <PrimaryButton onClick={onNext}>
          Next Child <ArrowRight className="h-5 w-5" />
        </PrimaryButton>
      </div>
    </div>
  );
}
