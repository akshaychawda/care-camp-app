# Pre-Camp UX Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 11 UX issues found in the full-persona audit before the June 6 camp, covering critical data bugs and high-impact parent/admin/CHO experience gaps.

**Architecture:** All changes are frontend-only React/TypeScript except Task 7, which adds `city` to the `getCampStatus` API call. No new files needed — all edits are to existing route and component files. Tasks are independent and each commits separately.

**Tech Stack:** React 18, TypeScript, TanStack Router, Supabase client, Tailwind CSS. No test framework — verification is `npm run build` (type-check) + browser steps. Build command: `npm run build` from `~/Projects/care-camp-app`.

---

## File Map

| File                                       | Tasks             |
| ------------------------------------------ | ----------------- |
| `src/routes/admin.new.tsx`                 | Task 1            |
| `src/routes/admin.index.tsx`               | Tasks 2, 3, 4     |
| `src/routes/admin.sessions.$sessionId.tsx` | Tasks 5, 6        |
| `src/lib/api.ts`                           | Task 7            |
| `src/components/DreamFlow.tsx`             | Tasks 7, 8, 9, 10 |

---

## Task 1: A8 — Fix date display bug on new camp confirmation

**Files:**

- Modify: `src/routes/admin.new.tsx` (line 198)

The `Confirmation` component uses `new Date(data.session.date)` which interprets the ISO date string as UTC, causing June 6 to display as June 5 in IST. The same bug was fixed in `admin.index.tsx` and `admin.sessions.$sessionId.tsx` in the previous session.

- [ ] **Step 1: Apply the fix**

In `src/routes/admin.new.tsx`, find line 198:

```tsx
{new Date(data.session.date).toLocaleDateString("en-IN", {
```

Change to:

```tsx
{new Date(data.session.date + "T00:00:00").toLocaleDateString("en-IN", {
```

Also apply the same fix to the `share` function in the same file at line 176:

```tsx
// Before:
${new Date(data.session.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
// After:
${new Date(data.session.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
```

- [ ] **Step 2: Build check**

```bash
cd ~/Projects/care-camp-app && npm run build
```

Expected: `✓ built in Xs` with no errors.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/care-camp-app && git add src/routes/admin.new.tsx && git commit -m "fix: date timezone bug on new camp confirmation screen"
```

---

## Task 2: C1 — CHO-aware empty state on dashboard

**Files:**

- Modify: `src/routes/admin.index.tsx` (lines 148–153)

A CHO with no assigned camps sees "No camps yet. Create one to get started." — but CHOs cannot create camps.

- [ ] **Step 1: Update the empty state**

In `src/routes/admin.index.tsx`, find the empty state block (currently around line 149):

```tsx
{
  sessions.length === 0
    ? "No camps yet. Create one to get started."
    : "No camps match these filters.";
}
```

Replace with:

```tsx
{
  sessions.length === 0
    ? profile?.role === "cho"
      ? "No camps have been shared with you yet. Ask your CO to share a camp with you."
      : "No camps yet. Create one to get started."
    : "No camps match these filters.";
}
```

- [ ] **Step 2: Build check**

```bash
cd ~/Projects/care-camp-app && npm run build
```

Expected: `✓ built in Xs` with no errors.

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/care-camp-app && git add src/routes/admin.index.tsx && git commit -m "fix: role-aware empty state for CHO on dashboard"
```

---

## Task 3: A4 — Stats tiles reflect current filter

**Files:**

- Modify: `src/routes/admin.index.tsx` (lines 60–80)

The `totals` memo uses `sessions` (all sessions) as its source. When the city/chapter filter is active, the stat tiles must show the filtered totals. The fix: move `filtered` before `totals` and memoize it, then compute `totals` from `filtered`.

- [ ] **Step 1: Reorder and memoize**

In `src/routes/admin.index.tsx`, replace the block from `const totals` through `const filtered` (lines 60–80):

```tsx
const cities = useMemo(() => Array.from(new Set(sessions.map((s) => s.city))).sort(), [sessions]);
const chapters = useMemo(
  () =>
    Array.from(
      new Set(sessions.filter((s) => city === "all" || s.city === city).map((s) => s.chapter)),
    ).sort(),
  [city, sessions],
);

const filtered = useMemo(
  () =>
    sessions.filter(
      (s) => (city === "all" || s.city === city) && (chapter === "all" || s.chapter === chapter),
    ),
  [sessions, city, chapter],
);

const totals = useMemo(
  () => ({
    camps: filtered.length,
    parents: filtered.reduce((a, s) => a + s.parent_count, 0),
    cards: filtered.reduce((a, s) => a + s.card_count, 0),
  }),
  [filtered],
);
```

Note: the original order was `totals` → `cities` → `chapters` → `filtered`. The new order is `cities` → `chapters` → `filtered` → `totals`.

- [ ] **Step 2: Build check**

```bash
cd ~/Projects/care-camp-app && npm run build
```

Expected: `✓ built in Xs` with no errors.

- [ ] **Step 3: Browser verify**

Start dev server: `npm run dev`. Open the dashboard. With "All Cities" selected, note the total camp count. Switch to a specific city — the stat tiles should update to show only that city's counts.

- [ ] **Step 4: Commit**

```bash
cd ~/Projects/care-camp-app && git add src/routes/admin.index.tsx && git commit -m "fix: stats tiles reflect active city/chapter filter"
```

---

## Task 4: A5 — Open/closed badge on camp list

**Files:**

- Modify: `src/routes/admin.index.tsx` (mobile card ~line 166, desktop table ~line 210)

`CampSession` already has `is_open: boolean`. Need to surface it visually in both the mobile card view and the desktop table.

- [ ] **Step 1: Add badge to mobile card**

In `src/routes/admin.index.tsx`, in the mobile card block, find the `<Tag>` date line and add an open/closed badge after it:

```tsx
<Tag icon={<Calendar className="h-3 w-3" />}>
  {new Date(s.date + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}
</Tag>
<span
  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
    s.is_open
      ? "bg-emerald-500/15 text-emerald-400"
      : "bg-secondary text-muted-foreground"
  }`}
>
  {s.is_open ? "● Open" : "Closed"}
</span>
```

- [ ] **Step 2: Add column to desktop table**

In the desktop `<thead>`, add a Status column between Chapter and Date:

```tsx
<th className="text-left font-semibold px-5 py-3">Status</th>
```

In each desktop `<tr>`, add the matching `<td>` after the Chapter cell:

```tsx
<td className="px-5 py-3">
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
      s.is_open ? "bg-emerald-500/15 text-emerald-400" : "bg-secondary text-muted-foreground"
    }`}
  >
    {s.is_open ? "● Open" : "Closed"}
  </span>
</td>
```

Also, while in the desktop table, remove the redundant standalone `City` column (the Camp column already shows `city — chapter`). Remove the `<th>City</th>` and its corresponding `<td>` from the `<tr>`:

Remove this `<th>`:

```tsx
<th className="text-left font-semibold px-5 py-3">City</th>
```

Remove this `<td>`:

```tsx
<td className="px-5 py-3 text-muted-foreground">
  <span className="inline-flex items-center gap-1">
    <MapPin className="h-3 w-3" />
    {s.city}
  </span>
</td>
```

Also remove the now-unused `MapPin` import if it's only used there.

- [ ] **Step 3: Build check**

```bash
cd ~/Projects/care-camp-app && npm run build
```

Expected: `✓ built in Xs` with no errors.

- [ ] **Step 4: Commit**

```bash
cd ~/Projects/care-camp-app && git add src/routes/admin.index.tsx && git commit -m "feat: open/closed badge on camp list; remove redundant City column"
```

---

## Task 5: A13 — Refresh button and auto-refresh on registrations

**Files:**

- Modify: `src/routes/admin.sessions.$sessionId.tsx`

The registrations list loads once and never updates. Fix: add a visible refresh button header + auto-refresh every 30s when the camp is open.

- [ ] **Step 1: Extract a `loadRegistrations` function**

In `SessionDetail`, the current `useEffect` loads session + registrations together. Add a separate `loadRegistrations` function that can be called independently:

In `SessionDetail`, after the state declarations, add:

```tsx
const loadRegistrations = async () => {
  if (!sessionId) return;
  const { registrations: regs } = await getSession(sessionId);
  setRegistrations(regs);
};
```

- [ ] **Step 2: Add RefreshCw import and refresh button**

Add `RefreshCw` to the lucide import line at the top of the file:

```tsx
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  UserPlus,
  X,
  RefreshCw,
} from "lucide-react";
```

In the registrations `<section>`, update the header to include a refresh button:

```tsx
<div className="px-5 py-4 border-b border-border flex items-center justify-between">
  <div>
    <h2 className="font-semibold text-foreground">Registrations</h2>
    <p className="text-xs text-muted-foreground mt-0.5">{registrations.length} registered</p>
  </div>
  <button
    onClick={loadRegistrations}
    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition"
    title="Refresh registrations"
  >
    <RefreshCw className="h-4 w-4" />
  </button>
</div>
```

- [ ] **Step 3: Add auto-refresh when camp is open**

After the `loadRegistrations` function declaration, add a `useEffect` for auto-refresh:

```tsx
useEffect(() => {
  if (!isOpen) return;
  const id = setInterval(loadRegistrations, 30_000);
  return () => clearInterval(id);
}, [isOpen]);
```

- [ ] **Step 4: Build check**

```bash
cd ~/Projects/care-camp-app && npm run build
```

Expected: `✓ built in Xs` with no errors.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/care-camp-app && git add src/routes/admin.sessions.\$sessionId.tsx && git commit -m "feat: refresh button and 30s auto-refresh on live camp registrations"
```

---

## Task 6: C3 — Fullscreen QR mode for CHO camp day

**Files:**

- Modify: `src/routes/admin.sessions.$sessionId.tsx`

The QR on the camp detail page is 160px. CHOs showing it to parents during a camp need a fullscreen version. Add a "Show to parent" button that opens a fixed fullscreen overlay with only the large QR code (tap anywhere to dismiss).

- [ ] **Step 1: Add fullscreen state and overlay to CampQR**

Replace the entire `CampQR` function with this version:

```tsx
function CampQR({ sessionId }: { sessionId: string }) {
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const campLink = `${window.location.origin}/?session=${sessionId}`;

  useEffect(() => {
    QRCode.toDataURL(campLink, { width: 240, margin: 1 })
      .then(setQr)
      .catch(() => {});
  }, [campLink]);

  const copy = async () => {
    await navigator.clipboard.writeText(campLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center cursor-pointer"
          onClick={() => setFullscreen(false)}
        >
          {qr ? (
            <img src={qr} alt="Camp QR code" className="w-72 h-72 rounded-2xl" />
          ) : (
            <div className="w-72 h-72 rounded-2xl bg-secondary animate-pulse" />
          )}
          <p className="mt-6 text-sm text-gray-500">Tap anywhere to close</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
          Camp QR Code
        </div>
        <div className="flex justify-center">
          {qr ? (
            <img src={qr} alt="Camp QR code" className="w-40 h-40 rounded-lg" />
          ) : (
            <div className="w-40 h-40 rounded-lg bg-secondary animate-pulse" />
          )}
        </div>
        <code className="block text-xs text-muted-foreground break-all bg-secondary px-2 py-1.5 rounded">
          {campLink}
        </code>
        <button
          onClick={() => setFullscreen(true)}
          className="w-full h-9 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition"
        >
          Show to parent ↗
        </button>
        <button
          onClick={copy}
          className="w-full h-9 rounded-lg border-2 border-primary text-primary font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/5 transition"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd ~/Projects/care-camp-app && npm run build
```

Expected: `✓ built in Xs` with no errors.

- [ ] **Step 3: Browser verify**

Open a camp detail page. Click "Show to parent" — should open a white fullscreen overlay with a large QR code. Tap/click anywhere — should dismiss.

- [ ] **Step 4: Commit**

```bash
cd ~/Projects/care-camp-app && git add src/routes/admin.sessions.\$sessionId.tsx && git commit -m "feat: fullscreen QR present mode for CHO camp day use"
```

---

## Task 7: D1 + D3 — Invalid session error + city pre-fill

**Files:**

- Modify: `src/lib/api.ts` (getCampStatus)
- Modify: `src/components/DreamFlow.tsx` (useEffect + parent form)

Two fixes share the same touch point (`getCampStatus` return value and the `useEffect` that calls it), so they're combined in one task.

**D1:** Invalid session ID (PGRST116 Supabase error = "no rows") must show "no-session" step, not silently proceed to welcome.

**D3:** `getCampStatus` already fetches the session row — include `city` in the SELECT so DreamFlow can pre-fill the parent's city field.

- [ ] **Step 1: Update getCampStatus to return city**

In `src/lib/api.ts`, replace the `getCampStatus` function:

```typescript
export async function getCampStatus(id: string): Promise<{ is_open: boolean; city: string }> {
  const { data, error } = await supabase
    .from("camp_sessions")
    .select("is_open, city")
    .eq("id", id)
    .single();
  if (error) throw error;
  return { is_open: data.is_open, city: data.city ?? "" };
}
```

- [ ] **Step 2: Add sessionCity state to DreamFlow**

In `src/components/DreamFlow.tsx`, inside the `DreamFlow` function, add a new state variable after the existing state declarations (after `const [caption, setCaption] = ...`):

```tsx
const [sessionCity, setSessionCity] = useState<string>("");
```

- [ ] **Step 3: Update useEffect with D1 + D3 fixes**

Replace the existing `useEffect` (the camp status check):

```tsx
useEffect(() => {
  if (!sessionId) return;
  getCampStatus(sessionId)
    .then(({ is_open, city }) => {
      setSessionCity(city);
      setStep(is_open ? "welcome" : "camp-closed");
    })
    .catch((err) => {
      // PGRST116 = "no rows returned" — session ID does not exist
      if (err?.code === "PGRST116") {
        setStep("no-session");
      } else {
        // Network or other error — proceed to welcome rather than blocking
        setStep("welcome");
      }
    });
}, [sessionId]);
```

- [ ] **Step 4: Pre-fill city in the parent form**

When sessionCity is known, pre-populate `data.city` on the parent step. The cleanest place is where the "checking" step resolves to "welcome" — in the same `.then()` handler above, add a city pre-fill:

Update the `.then()` handler:

```tsx
.then(({ is_open, city }) => {
  setSessionCity(city);
  if (city) {
    setData((d) => ({ ...d, city }));
  }
  setStep(is_open ? "welcome" : "camp-closed");
})
```

- [ ] **Step 5: Make city field read-only when pre-filled from session**

In the `"parent"` step JSX, replace the `<Field label="City" ...>` with a conditional: show a locked read-only display when sessionCity is set, or the regular editable field otherwise.

Find the parent step City field:

```tsx
<Field label="City" value={data.city} onChange={(v) => update("city", v)} placeholder="e.g. Pune" />
```

Replace with:

```tsx
{
  sessionCity ? (
    <div>
      <span className="block text-sm font-semibold text-foreground/80 mb-2 px-1">City</span>
      <div className="w-full h-14 px-4 rounded-2xl bg-secondary border-2 border-transparent text-lg flex items-center text-foreground/70">
        {sessionCity}
      </div>
    </div>
  ) : (
    <Field
      label="City"
      value={data.city}
      onChange={(v) => update("city", v)}
      placeholder="e.g. Pune"
    />
  );
}
```

- [ ] **Step 6: Update canContinue to not require city when pre-filled**

The parent step's `canContinue` already checks `data.city`:

```tsx
canContinue={!!(data.parentName && /^[6-9]\d{9}$/.test(data.phone) && data.area)}
```

City was already removed from this check in the previous session (only name, phone, area). Verify this is still the case — if city was still in the check, it can be removed since it's now always pre-filled.

- [ ] **Step 7: Build check**

```bash
cd ~/Projects/care-camp-app && npm run build
```

Expected: `✓ built in Xs` with no errors.

- [ ] **Step 8: Commit**

```bash
cd ~/Projects/care-camp-app && git add src/lib/api.ts src/components/DreamFlow.tsx && git commit -m "fix: invalid session shows error screen; city pre-filled from session"
```

---

## Task 8: D4 — Retain parent info for second child

**Files:**

- Modify: `src/components/DreamFlow.tsx` (NextChild onNext handler)

When a parent has two children, "Next Child" currently resets ALL fields including parent name, phone, city, area. Fix: preserve parent fields, clear only child-specific fields, and navigate directly to the child step (skipping the parent form re-entry).

- [ ] **Step 1: Update the NextChild onNext handler**

In `src/components/DreamFlow.tsx`, find the `{step === "next" && <NextChild ...>}` block:

```tsx
{
  step === "next" && (
    <NextChild
      childName={data.childName || "Your child"}
      onNext={() => {
        setData({ ...EMPTY });
        setImageUrl(null);
        setCaption(null);
        setSaveError(null);
        go("parent");
      }}
    />
  );
}
```

Replace with:

```tsx
{
  step === "next" && (
    <NextChild
      childName={data.childName || "Your child"}
      imageUrl={imageUrl}
      onNext={() => {
        setData((prev) => ({
          ...EMPTY,
          parentName: prev.parentName,
          phone: prev.phone,
          city: prev.city,
          area: prev.area,
        }));
        setImageUrl(null);
        setCaption(null);
        setImageGenFailed(false);
        setSaveError(null);
        go("child");
      }}
    />
  );
}
```

Note: `imageGenFailed` is added in Task 9 — add the `setImageGenFailed(false)` line in Task 9's pass, not here. For now, omit it.

- [ ] **Step 2: Update NextChild component signature**

`NextChild` currently accepts `{ childName, onNext }`. It now also needs `imageUrl` for Task 10 (D7). Add it now so Task 10 can use it:

```tsx
function NextChild({ childName, imageUrl, onNext }: { childName: string; imageUrl: string | null; onNext: () => void }) {
```

The `imageUrl` prop isn't used yet — it will be wired in Task 10.

- [ ] **Step 3: Build check**

```bash
cd ~/Projects/care-camp-app && npm run build
```

Expected: `✓ built in Xs` with no errors.

- [ ] **Step 4: Browser verify (manual)**

Start dev server. Open the parent flow with a valid session ID. Complete the full flow for one child. On the "Next Child" screen, tap "Next Child". Verify: the flow jumps to the **child name** step (not the parent form), and the parent fields (if visible by navigating back) are still populated.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/care-camp-app && git add src/components/DreamFlow.tsx && git commit -m "fix: retain parent info and skip to child step on second registration"
```

---

## Task 9: D6 — Honest fallback when image generation fails

**Files:**

- Modify: `src/components/DreamFlow.tsx`

When `generateDreamCard` returns `{ imageUrl: null }`, the reveal screen silently shows a generic placeholder image. The parent thinks it's their personalised card. Fix: track whether generation failed, and show a clear explanation on the reveal screen.

- [ ] **Step 1: Add imageGenFailed state**

In `DreamFlow`, add a new state variable after `const [caption, setCaption] = ...`:

```tsx
const [imageGenFailed, setImageGenFailed] = useState(false);
```

- [ ] **Step 2: Set imageGenFailed in submitAndAdvance**

In `submitAndAdvance`, after the `generateDreamCard` call:

```tsx
const { imageUrl: url, caption: cap } = await generateDreamCard(registration.id, data);
setImageUrl(url);
setCaption(cap);
setImageGenFailed(!url);
go("reveal");
```

- [ ] **Step 3: Pass genFailed to Reveal**

In the `{step === "reveal" && ...}` block, pass `genFailed`:

```tsx
{
  step === "reveal" && (
    <Reveal
      childName={data.childName || "Your child"}
      dream={data.q1 || "something wonderful"}
      problem={data.q3 || "the world"}
      imageUrl={imageUrl}
      caption={caption}
      genFailed={imageGenFailed}
      onNext={() => go("next")}
    />
  );
}
```

- [ ] **Step 4: Update Reveal component to accept and show genFailed**

Update the `Reveal` function signature and add the failure banner:

```tsx
function Reveal({
  childName,
  dream,
  problem,
  imageUrl,
  caption,
  genFailed,
  onNext,
}: {
  childName: string;
  dream: string;
  problem: string;
  imageUrl: string | null;
  caption: string | null;
  genFailed: boolean;
  onNext: () => void;
}) {
  const article = /^[aeiou]/i.test(dream) ? "an" : "a";
  const displayCaption =
    caption ||
    (dream
      ? `${childName} dreams of becoming ${article} ${dream.toLowerCase()}.`
      : `${childName} is going to change the world.`);

  const src = imageUrl ?? dreamCard;

  const handleDownload = async () => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${childName}-dream-card.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      const a = document.createElement("a");
      a.href = src;
      a.download = `${childName}-dream-card.png`;
      a.click();
    }
  };

  return (
    <div className="flex flex-col">
      <h2 className="text-2xl font-bold mb-4 text-center">{childName}'s Dream Card</h2>

      {genFailed && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm leading-relaxed">
          We couldn't create {childName}'s personalised card right now — the image service was busy.
          A default card is shown below. Your volunteer can help you try again later.
        </div>
      )}

      <div className="relative rounded-3xl overflow-hidden shadow-card bg-gradient-card">
        <img
          src={src}
          alt={`${childName}'s dream illustration`}
          width={1024}
          height={1024}
          className="w-full aspect-square object-cover"
        />
        <div className="absolute top-3 right-3 bg-[#C62828] rounded-xl px-3 py-2 flex items-center">
          <img src={madLogo} alt="MAD" className="h-6 w-auto object-contain" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-5 pt-12">
          <p className="font-display italic text-white text-lg leading-snug">"{displayCaption}"</p>
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
```

- [ ] **Step 5: Reset imageGenFailed on Next Child**

In the NextChild `onNext` handler (Task 8), add the reset:

```tsx
setImageGenFailed(false);
```

- [ ] **Step 6: Build check**

```bash
cd ~/Projects/care-camp-app && npm run build
```

Expected: `✓ built in Xs` with no errors.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/care-camp-app && git add src/components/DreamFlow.tsx && git commit -m "fix: show honest message when image generation fails instead of silent placeholder"
```

---

## Task 10: D7 — Card loss prevention on NextChild screen

**Files:**

- Modify: `src/components/DreamFlow.tsx` (NextChild component)

After "Next Child" is tapped from the reveal screen, `imageUrl` is cleared and the card is gone. The `NextChild` screen should keep a thumbnail of the just-generated card visible with a download button, so a parent can still save it before the next registration begins.

- [ ] **Step 1: Update NextChild to show the previous card**

Replace the entire `NextChild` function:

```tsx
function NextChild({
  childName,
  imageUrl,
  onNext,
}: {
  childName: string;
  imageUrl: string | null;
  onNext: () => void;
}) {
  const handleDownload = async () => {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${childName}-dream-card.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      const a = document.createElement("a");
      a.href = imageUrl;
      a.download = `${childName}-dream-card.png`;
      a.click();
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-whatsapp/30 rounded-full blur-3xl" />
        <div className="relative h-20 w-20 rounded-full bg-whatsapp flex items-center justify-center shadow-warm text-4xl">
          🌟
        </div>
      </div>
      <h2 className="text-2xl font-bold leading-tight max-w-[320px]">
        Done! <span className="text-primary">{childName}</span>'s card is ready.
      </h2>
      <p className="mt-3 text-base text-muted-foreground">
        Thank you for being part of this moment.
      </p>

      {imageUrl && (
        <div className="mt-6 w-full max-w-[240px] rounded-2xl overflow-hidden border border-border shadow-card">
          <img
            src={imageUrl}
            alt={`${childName}'s dream card`}
            className="w-full aspect-square object-cover"
          />
          <button
            onClick={handleDownload}
            className="w-full py-2.5 bg-card text-primary text-sm font-semibold flex items-center justify-center gap-2 hover:bg-secondary transition"
          >
            <Download className="h-4 w-4" /> Download {childName}'s card
          </button>
        </div>
      )}

      <div className="flex-1" />
      <div className="w-full pt-8">
        <PrimaryButton onClick={onNext}>
          Next Child <ArrowRight className="h-5 w-5" />
        </PrimaryButton>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build check**

```bash
cd ~/Projects/care-camp-app && npm run build
```

Expected: `✓ built in Xs` with no errors.

- [ ] **Step 3: Browser verify**

Complete the parent flow with a valid session. On the NextChild screen, verify the card thumbnail is visible with a download button. Tap download — card should save. Tap "Next Child" — card thumbnail disappears (imageUrl cleared) and child form appears.

- [ ] **Step 4: Final commit + push**

```bash
cd ~/Projects/care-camp-app && git add src/components/DreamFlow.tsx && git commit -m "feat: keep card thumbnail visible on NextChild screen to prevent card loss"
git push
```

---

## Self-Review

**Spec coverage check:**

| Spec item                            | Task      |
| ------------------------------------ | --------- |
| A8 date bug on new camp confirmation | Task 1 ✓  |
| C1 CHO wrong empty state             | Task 2 ✓  |
| A4 stats filtered                    | Task 3 ✓  |
| A5 open/closed badge                 | Task 4 ✓  |
| A13 refresh registrations            | Task 5 ✓  |
| C3 fullscreen QR                     | Task 6 ✓  |
| D1 invalid session → error           | Task 7 ✓  |
| D3 city pre-fill                     | Task 7 ✓  |
| D4 retain parent info 2nd child      | Task 8 ✓  |
| D6 honest gen failure                | Task 9 ✓  |
| D7 card loss prevention              | Task 10 ✓ |

**Placeholder check:** No TBDs, no "implement later", no vague steps — each step contains exact code.

**Type consistency check:**

- `getCampStatus` returns `{ is_open: boolean; city: string }` — used in Task 7 ✓
- `imageGenFailed` state added in Task 9, reset in Task 9 (NextChild handler) ✓
- `NextChild` gains `imageUrl: string | null` prop in Task 8, used in Task 10 ✓
- `Reveal` gains `genFailed: boolean` prop in Task 9, passed in same task ✓

**Ordering check:**

- Task 8 adds `imageUrl` to `NextChild` props signature — Task 10 depends on this. Order is correct ✓
- Task 9 adds `imageGenFailed` state — `setImageGenFailed(false)` is added to NextChild handler in same Task 9 step ✓
- `setImageGenFailed(false)` reference in Task 8's step description is noted as "add in Task 9" to avoid undefined reference ✓
