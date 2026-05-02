# CLAUDE.md — Care Camps App

## What this is
Mobile web app for MAD Care Camp entry events. A parent/child pair answers aspiration questions, the app generates an AI image card of the child's dream, and delivers it to the parent's WhatsApp. MAD coordinators monitor activity via an admin dashboard.

Full PRD: `docs/prd.md` — read this before planning or building anything.

**Builder context**: The person building this has no prior coding experience. Plans and instructions must be explicit, step-by-step, and assume zero debugging ability. Prefer simple, working solutions over elegant ones.

---

## Tech stack
| Layer | Tool |
|-------|------|
| Framework | Vite + React + TypeScript |
| Routing | TanStack Router (file-based, routes in `src/routes/`) |
| UI components | shadcn/ui (Radix UI primitives + Tailwind) |
| Backend / deploy | Cloudflare Workers (`wrangler.jsonc`) |
| Database (dev) | Supabase (PostgreSQL — easy setup, same SQL as AWS RDS) |
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
- `src/lib/admin-data.ts` — mock types + data (replace with real DB calls)

## Dev commands
```bash
npm install      # install dependencies
npm run dev      # start dev server
npm run build    # production build
npm run lint     # eslint
```

---

## Build status
| Feature | Status |
|---------|--------|
| Parent/child UI flow | Built (Lovable) — UI only, no backend |
| Admin dashboard UI | Built (Lovable) — UI only, mock data |
| Database (sessions, registrations) | **To build — Phase 1** |
| API layer | **To build — Phase 2** |
| Frontend wired to real data | **To build — Phase 3** |
| QR code generation | **To build — Phase 3** |
| "Next child" session reset | **To build — Phase 3** |
| AI image generation | Deferred — Phase 4 (needs API key) |
| WhatsApp delivery | Deferred — Phase 5 (needs Twilio setup) |
| AWS migration | Deferred — Phase 6 |

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
3. Check `docs/` for any plan files
4. Ask: build, audit, kaizen, or something else?
