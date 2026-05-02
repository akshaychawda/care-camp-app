import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarIcon, Check, Copy, Share2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import QRCode from "qrcode";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { createSession, type CampSession } from "@/lib/api";

export const Route = createFileRoute("/admin/new")({
  component: NewCamp,
  head: () => ({
    meta: [{ title: "Create Camp Session — MAD Admin" }],
  }),
});

function NewCamp() {
  const [city, setCity] = useState("");
  const [chapter, setChapter] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ session: CampSession; link: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city || !chapter || !date) return;
    setSaving(true);
    setError(null);
    try {
      const session = await createSession(city, chapter, format(date, "yyyy-MM-dd"));
      const link = `${window.location.origin}/?session=${session.id}`;
      setCreated({ session, link });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create session. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (created) return (
    <Confirmation
      data={created}
      onReset={() => { setCreated(null); setCity(""); setChapter(""); setDate(undefined); }}
    />
  );

  return (
    <div className="px-5 md:px-10 py-6 md:py-10 max-w-2xl">
      <Link to="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Create New Camp</h1>
      <p className="text-sm text-muted-foreground mb-8">Set up a Care Camp session for your chapter.</p>

      <form onSubmit={submit} className="bg-card border border-border rounded-xl p-6 space-y-5">
        <FormField label="City">
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Pune" required
            className="w-full h-11 px-3 rounded-lg border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </FormField>

        <FormField label="Chapter">
          <input value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="e.g. Deccan" required
            className="w-full h-11 px-3 rounded-lg border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </FormField>

        <FormField label="Date">
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className={cn(
                "w-full h-11 px-3 rounded-lg border border-border bg-input text-sm flex items-center justify-between text-left",
                !date && "text-muted-foreground"
              )}>
                {date ? format(date, "PPP") : "Pick a date"}
                <CalendarIcon className="h-4 w-4 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className={cn("p-3 pointer-events-auto")} />
            </PopoverContent>
          </Popover>
        </FormField>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
        )}

        <button
          type="submit"
          disabled={!city || !chapter || !date || saving}
          className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-40 hover:opacity-90 transition flex items-center justify-center gap-2"
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : "Create Session"}
        </button>
      </form>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Confirmation({ data, onReset }: { data: { session: CampSession; link: string }; onReset: () => void }) {
  const [qr, setQr] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(data.link, { width: 320, margin: 1, color: { dark: "#1a3a4a", light: "#ffffff" } })
      .then(setQr).catch(() => setQr(""));
  }, [data.link]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const share = () => {
    const text = `Join the MAD Care Camp — ${data.session.city} (${data.session.chapter}) on ${new Date(data.session.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}: ${data.link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div className="px-5 md:px-10 py-6 md:py-10 max-w-2xl">
      <Link to="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <div className="bg-card border border-border rounded-xl p-6 md:p-8">
        <div className="flex items-center gap-2 text-whatsapp font-semibold text-sm mb-4">
          <Check className="h-5 w-5" /> Session created
        </div>

        <h1 className="text-2xl font-bold text-foreground">{data.session.city} — {data.session.chapter}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date(data.session.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </p>

        <div className="my-8 flex flex-col items-center">
          <div className="w-56 h-56 rounded-xl bg-secondary border border-border flex items-center justify-center overflow-hidden">
            {qr ? (
              <img src={qr} alt="Session QR code" className="w-full h-full object-contain" />
            ) : (
              <span className="text-xs text-muted-foreground font-semibold">Generating QR…</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground text-center mt-4 max-w-xs">
            Share this link with your volunteers before the event.
          </p>
          <code className="mt-3 text-xs px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground break-all max-w-full">
            {data.link}
          </code>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button onClick={copy}
            className="h-11 rounded-lg border-2 border-primary text-primary font-semibold flex items-center justify-center gap-2 hover:bg-primary/5 transition">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy Link"}
          </button>
          <button onClick={share}
            className="h-11 rounded-lg bg-whatsapp text-whatsapp-foreground font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition">
            <Share2 className="h-4 w-4" /> Share on WhatsApp
          </button>
        </div>

        <button onClick={onReset} className="w-full mt-3 h-11 text-sm font-semibold text-muted-foreground hover:text-foreground">
          Create another →
        </button>
      </div>
    </div>
  );
}
