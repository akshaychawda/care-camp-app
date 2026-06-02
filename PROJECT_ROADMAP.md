# PROJECT_ROADMAP.md — Care Camps App

## ✅ Phase 0 — UI Scaffolding (Lovable)

- [x] Parent/child flow UI (DreamFlow, 7 screens)
- [x] Admin dashboard UI with mock data
- [x] Responsive admin (mobile, tablet, desktop)
- [x] Vite + React + TypeScript + TanStack Router + shadcn/ui + Cloudflare Workers

## ✅ Phase 1–3 — Supabase Backend + Frontend Wiring

- [x] Supabase tables: `camp_sessions`, `parent_registrations`, `child_answers`
- [x] API layer: `createSession`, `getSessions`, `getSession`, `registerParentAndChild`, `markCardGenerated`
- [x] Admin dashboard fetches live data
- [x] Session detail shows real registrations
- [x] New camp form saves to DB + generates QR + WhatsApp share
- [x] DreamFlow reads `?session=` param, saves all 5 answers on submit
- [x] "Next Child" resets form without losing session context

## ✅ Phase 3.5 — Camp Status, QR Detail, Design System

- [x] Camp open/close status with admin toggle (optimistic update)
- [x] "Camp Closed" screen in parent flow
- [x] QR code accessible from session detail page
- [x] Rename "session" → "camp" in all UI labels
- [x] MAD design system applied: red primary, Inter font, system dark mode
- [x] `docs/design-system.md` created

## ⬜ Phase 4 — AI Image Generation

- [ ] Add `image_url TEXT` column to `parent_registrations`
- [ ] Create server function calling DALL-E 3 (needs `OPENAI_API_KEY`)
- [ ] Update `markCardGenerated()` to also store `image_url`
- [ ] DreamFlow loading step calls server function
- [ ] Card reveal shows real AI-generated image

**Blocked on:** OpenAI or Replicate API key

## ⬜ Phase 5 — WhatsApp Delivery

- [ ] Twilio WhatsApp Business API integration
- [ ] Send card image to parent's phone number after reveal
- [ ] Fallback: download button (already exists)

**Blocked on:** Twilio account + WhatsApp Business API approval

## ⬜ Phase 6 — AWS Migration

- [ ] Export Supabase schema + data
- [ ] Point connection string at AWS RDS (same PostgreSQL engine — no code changes)
- [ ] Cloudflare → AWS hosting migration (MAD tech team)

## ⬜ Phase 7 — Deployment

- [ ] Run `npm run deploy` (Cloudflare Workers)
- [ ] Set GitHub Secrets for CI/CD
