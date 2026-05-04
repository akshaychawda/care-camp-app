# PROJECT_HISTORY.md — Care Camps App

---

## 2026-05-04 — Phase 3.5: Camp status, QR on detail, design system

**Accomplishments**
- Added `is_open` column to `camp_sessions` (Supabase migration)
- Added `toggleCampStatus()` and `getCampStatus()` to API layer
- Admin camp detail: Open/Closed badge + toggle button with optimistic update + rollback
- Admin camp detail: QR code + copy link surfaced in stats sidebar (previously only on new-camp confirmation)
- Parent flow: new `camp-closed` step — checks `is_open` on load, shows lock screen if camp is closed
- Renamed "session" → "camp" in all user-visible UI labels
- Established MAD design system: `docs/design-system.md` — red #C62828, yellow #F59E0B, teal #0D9488, Inter font
- Applied MAD design tokens to the app: replaced warm-orange primary + Fraunces serif with MAD red + Inter
- Switched dark mode from class-based (`.dark`) to system-responsive (`prefers-color-scheme`)
- Created `.agent/gotchas.md` and `docs/lessons_learned.md`
- Audit passed, kaizen done, all changes committed and pushed

**Key learnings**
- Apply design tokens before building UI — retheme at audit costs double the work
- Dark mode tokens must be explicitly defined alongside light tokens
- Grep all user-visible strings before a rename — missed one without it
- Verify DB migration with SQL before writing dependent TypeScript

---

## 2026-05-02 — Session 2: Closeout + Phase 4 planning

**Accomplishments**
- Discovered all Phase 1-3 work was uncommitted — committed, fixed git credentials, pushed to GitHub
- Ran full audit: extracted `toSession()` helper (DRY fix), fixed CardYesNo inconsistency, fixed empty catch block, auto-fixed prettier across all files
- Ran kaizen: 5 SDLC rules added to CLAUDE.md (commit discipline, worktree .env check, mapper DRY, component consistency, credentials pre-flight)
- Ran closeout: created PROJECT_HISTORY.md, docs/BUGS.md, updated CLAUDE.md build status and session startup checklist
- Designed Phase 4 plan (AI image generation via DALL-E 3 + TanStack Start server function) — waiting on OpenAI API key to build

**Stopped because:** No OpenAI or Replicate API key available. Resume when key is ready.

**Resume instructions:** Read CLAUDE.md — Phase 4 plan is fully written there. Just need the API key.

---

## 2026-05-02 — Phases 1–3: Supabase backend + full frontend wiring

**Accomplishments**
- Created Supabase project with three tables: `camp_sessions`, `parent_registrations`, `child_answers`
- Built Supabase client (`src/lib/supabase.ts`) and full API layer (`src/lib/api.ts`) with five functions: `createSession`, `getSessions`, `getSession`, `registerParentAndChild`, `markCardGenerated`
- Admin dashboard now fetches live sessions from Supabase with city/chapter filter dropdowns
- Session detail page shows real registrations from DB
- New camp form saves to DB and generates a QR code with Copy Link + WhatsApp share
- DreamFlow reads `?session=` URL param, shows error screen if missing, saves registration + all 5 answers on final submit, "Next Child" resets form without losing session context
- Audit passed: extracted `toSession()` helper to fix DRY violation, fixed CardYesNo component inconsistency between mobile and desktop views
- CLAUDE.md updated with session startup checklist and SDLC rules from kaizen

**Key learnings**
- Commit after every phase — uncommitted work is invisible to worktrees and future sessions
- Extract type-transformation helpers early (mappers/transformers drift silently when duplicated)
- UI components must be used consistently — never inline a component's equivalent in the same file
- Verify git credentials with `--dry-run` before a real push

---

## Pre-2026-05-02 — Phase 0: UI scaffolding (Lovable)

**Accomplishments**
- Built full parent/child flow UI (DreamFlow component, 7 screens) in Lovable
- Built admin dashboard UI with mock data
- Made admin section responsive (mobile, tablet, desktop)
- Set up Vite + React + TypeScript + TanStack Router + shadcn/ui + Cloudflare Workers
