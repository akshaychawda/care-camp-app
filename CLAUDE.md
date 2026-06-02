# CLAUDE.md — Care Camps App

## What this is

Mobile web app for MAD (Make A Difference NGO) India. Parents scan a QR code at a Care Camp event, answer 5 aspiration questions about their child, and receive an AI-generated watercolor dream card. Internal staff manage camps via an authenticated dashboard.

**First camp: 2026-06-06. App is live at https://mad-care-camps.vercel.app**

## Stack

- **Frontend:** React + TypeScript + TanStack Router, Vite SPA
- **Hosting:** Vercel Pro
- **Database + Auth:** Supabase Pro (`etrlbxugodyvexzsyfdk.supabase.co`)
- **Email:** Brevo SMTP (sender: akshay.chawda@makeadiff.in)
- **AI:** GPT-4o-mini (scene design + caption) → gpt-image-2 (watercolor illustration)
- **Storage:** Supabase Storage bucket `dream-cards`

## Roles

| Role           | Who                         | Access                        |
| -------------- | --------------------------- | ----------------------------- |
| `super_admin`  | Akshay + leads              | Everything                    |
| `mad_employee` | MAD staff                   | All camps, approve users      |
| `co`           | Chapter Organizers          | Own + assigned + shared camps |
| `cho`          | Community Health Organizers | Shared camps only, read-only  |
| _(none)_       | Parents                     | Public unauthenticated flow   |

## Open bugs — fix in this order before 2026-06-06

1. **C4** `src/routes/admin.users.tsx` InviteModal — add `Authorization: Bearer <token>` header (invite broken)
2. **C3** `src/components/DreamFlow.tsx` — add `"checking"` initial step to prevent race condition on camp-closed redirect
3. **C1** `api/generate-image.ts` — verify registrationId in DB before generating; return cached URL if card_generated=true
4. **I1** `src/components/DreamFlow.tsx` — add 60s AbortController timeout to generateDreamCard fetch
5. **I2** `src/components/DreamFlow.tsx` Loading — cycle messages every 15s ("We're painting…" → "Adding touches…" → "Almost ready…")
6. **C2** `src/components/DreamFlow.tsx` parent step — phone validation `/^[6-9]\d{9}$/`
7. **I5** `src/routes/admin.users.tsx` UserRow — add Save button; don't fire updateUserRole on onChange
8. **M6** date timezone — `new Date(s.date + "T00:00:00")` in dashboard + session detail

## SDLC workflow

```
New feature   → /brainstorming first
Task list     → /executing-plans
After feature → /requesting-code-review
Before "done" → /verification-before-completion
Hit a bug     → /systematic-debugging
```

## Commands

```bash
npm run dev      # local dev
npm run build    # build (run before committing)
git push origin main  # triggers Vercel auto-deploy
```

## Environment variables (set in Vercel)

- `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` — client-side Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — server-side only (API functions)
- `OPENAI_API_KEY` — gpt-4o-mini + gpt-image-2

## Original What this is (kept for context)

Mobile web app for MAD Care Camp entry events. A parent/child pair answers aspiration questions, the app generates an AI image card of the child's dream, and delivers it to the parent's WhatsApp. MAD coordinators monitor activity via an admin dashboard.

Full PRD: `docs/prd.md` — read this before planning or building anything.

**Builder context**: The person building this has no prior coding experience. Plans and instructions must be explicit, step-by-step, and assume zero debugging ability. Prefer simple, working solutions over elegant ones.

---

## Tech stack

| Layer                         | Tool                                                              |
| ----------------------------- | ----------------------------------------------------------------- |
| Framework                     | Vite + React + TypeScript                                         |
| Routing                       | TanStack Router (file-based, routes in `src/routes/`)             |
| UI components                 | shadcn/ui (Radix UI primitives + Tailwind)                        |
| Backend / deploy              | Cloudflare Workers (`wrangler.jsonc`)                             |
| Database (dev)                | Supabase (PostgreSQL — easy setup, same SQL as AWS RDS)           |
| Database (production, future) | AWS RDS (PostgreSQL) — migration from Supabase is straightforward |

## Key files

- `src/components/DreamFlow.tsx` — parent/child flow (all 7 screens)
- `src/components/PhoneFrame.tsx` — mobile wrapper for the parent flow
- `src/components/admin/AdminLayout.tsx` — responsive admin sidebar/nav
- `src/routes/index.tsx` — parent flow route (`/`)
- `src/routes/admin.tsx` — admin layout route
- `src/routes/admin.index.tsx` — dashboard home (`/admin`)
- `src/routes/admin.new.tsx` — create new camp session (`/admin/new`)
- `src/routes/admin.sessions.$sessionId.tsx` — session detail (`/admin/sessions/:id`)
- `src/lib/supabase.ts` — Supabase client (reads from `.env`)
- `src/lib/api.ts` — all database functions (createSession, getSessions, getSession, registerParentAndChild, markCardGenerated)

## Dev commands

```bash
npm install      # install dependencies
npm run dev      # start dev server
npm run build    # production build
npm run lint     # eslint
```

---

## Build status

| Feature                                   | Status                                                          |
| ----------------------------------------- | --------------------------------------------------------------- |
| Parent/child UI flow                      | ✅ Built + wired to Supabase                                    |
| Admin dashboard UI                        | ✅ Built + live data from Supabase                              |
| Database (sessions, registrations)        | ✅ Phase 1 — done                                               |
| API layer                                 | ✅ Phase 2 — done                                               |
| Frontend wired to real data               | ✅ Phase 3 — done                                               |
| QR code generation                        | ✅ Phase 3 — done                                               |
| "Next child" session reset                | ✅ Phase 3 — done                                               |
| Cloudflare deployment                     | ⬜ Not yet deployed — run `npm run deploy`                      |
| Camp open/close status + toggle           | ✅ Phase 3.5 — done                                             |
| Camp closed screen (parent flow)          | ✅ Phase 3.5 — done                                             |
| QR code on session detail                 | ✅ Phase 3.5 — done                                             |
| MAD design system (red, Inter, dark mode) | ✅ Phase 3.5 — done                                             |
| AI image generation                       | ⬜ Phase 4 — ready to build (needs OpenAI or Replicate API key) |
| WhatsApp delivery                         | Deferred — Phase 5 (needs Twilio setup)                         |
| AWS migration                             | Deferred — Phase 6                                              |

## Current state (as of 2026-05-04)

- All code committed and pushed to GitHub: https://github.com/akshaychawda/care-camp-app
- Phase 3.5 complete: camp status toggle, QR on detail, closed-camp screen, MAD design system applied
- App tested locally — all flows working, light + dark mode verified
- **Next action:** Get an OpenAI API key (platform.openai.com) or Replicate key (replicate.com), then build Phase 4
- Phase 4 plan is fully designed — see below

## Phase 4 — ready to build (waiting on API key)

**What it does:** Generates a real AI image of the child's dream using their 5 answers, stores the URL in Supabase, shows it on the card reveal screen.

**Steps (already designed):**

1. Run in Supabase SQL Editor: `ALTER TABLE parent_registrations ADD COLUMN image_url TEXT;`
2. Add `OPENAI_API_KEY=sk-...` to `.env` and `.dev.vars`
3. Create `src/lib/generate-image.server.ts` — TanStack Start server function that calls DALL-E 3
4. Update `markCardGenerated()` in `src/lib/api.ts` to also store `image_url`
5. Update `DreamFlow.tsx` loading step to call server function, pass image URL to reveal screen
6. Replace placeholder `dreamCard` image with real generated image

**API choice:** DALL-E 3 (OpenAI) recommended — ~$0.04/image, best prompt following. Replicate (FLUX) is alternative at ~$0.003/image.

---

## Deferred features and why

**AI image generation (Phase 4)**
Needs a Replicate or OpenAI API key. Defer until the structural app is working end-to-end. In the meantime, the card reveal screen will show a placeholder image.

**WhatsApp delivery (Phase 5)**
Needs a Twilio account and WhatsApp Business API approval. Defer until core flow is stable. In the meantime, the download button serves as the fallback.

**AWS migration (Phase 6)**
MAD hosts on AWS and uses AWS RDS. The dev database (Supabase) is PostgreSQL — the same engine as RDS. When ready to migrate: export the Supabase schema and data, point the connection string at RDS, and redeploy. The app code does not need to change. Hosting migration (Cloudflare → AWS) is a separate step and can be handled by MAD's tech team.

---

## Build constraints

- Mobile browser only for parent flow — no app install
- Must work on mid-range Android on standard mobile data
- 30–50 parents per camp session
- Admin works on mobile, tablet, and desktop

## Out of scope — v1

Voice input, languages other than English, DPDP consent, structured child data storage, volunteer login, configurable questions, admin authentication.

---

## Session startup

1. Read this file
2. Read `docs/prd.md`
3. Read `PROJECT_HISTORY.md` — orient on what's done
4. Read `docs/BUGS.md` — check active debt
5. If working in a worktree, verify `.env` exists in the worktree directory. If missing: `cp <project-root>/.env .env`
6. Run `git status` — if uncommitted changes exist on `main`, commit or stash before starting new work
7. Run `npm run build` to confirm codebase compiles before starting new work
8. Tell user: current phase, what's done, what's next — then ask how to proceed

---

## SDLC rules (learned from practice)

**Commit after each phase.** Never leave a phase's work uncommitted. Untracked files are invisible to worktrees and future sessions.

**Mapper/transformer DRY.** If the same type is constructed from raw DB rows in more than one place, extract a shared helper before closing out.

**Component consistency.** If a component exists for a UI pattern, use it everywhere. Never inline its equivalent in the same codebase.

**Credentials pre-flight before push.** Run `git push --dry-run origin main` before the real push. If it fails with 403, fix via macOS Keychain Access (search "github.com", delete stale entry).
