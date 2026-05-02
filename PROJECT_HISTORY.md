# PROJECT_HISTORY.md — Care Camps App

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
