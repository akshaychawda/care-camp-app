# Care Camps App — MAD

Mobile web app for MAD Care Camp entry events. A parent and child answer 5 aspiration questions, the app generates an AI dream card, and delivers it to the parent's WhatsApp.

## Core Features

- **Parent/child flow** — 7-screen mobile UI (DreamFlow): welcome → parent info → child name → 5 questions → loading → card reveal → next child
- **Admin dashboard** — live data from Supabase, city/chapter filters, camp list with registration counts
- **New camp creation** — saves to DB, generates QR code, WhatsApp share link
- **Camp detail** — registrations table, Open/Closed status badge + toggle, QR code in sidebar
- **Camp open/close** — admin can close a camp; parent flow shows "Camp Closed" screen automatically
- **QR on detail** — copy-link button on every camp detail page
- **MAD design system** — red #C62828 primary, Inter font, system-responsive light/dark mode
- **Supabase backend** — `camp_sessions`, `parent_registrations`, `child_answers` tables

## Tech Stack

| Layer     | Tool                         |
| --------- | ---------------------------- |
| Framework | Vite + React + TypeScript    |
| Routing   | TanStack Router (file-based) |
| UI        | shadcn/ui + Tailwind CSS v4  |
| Database  | Supabase (PostgreSQL)        |
| Deploy    | Cloudflare Workers           |

## Dev Setup

```bash
npm install
cp .env.example .env        # add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev                 # http://localhost:5173
```

## Key Files

| File                                       | Purpose                         |
| ------------------------------------------ | ------------------------------- |
| `src/components/DreamFlow.tsx`             | Parent/child flow — all screens |
| `src/lib/api.ts`                           | All DB functions                |
| `src/lib/supabase.ts`                      | Supabase client                 |
| `src/routes/admin.index.tsx`               | Admin dashboard                 |
| `src/routes/admin.new.tsx`                 | Create new camp                 |
| `src/routes/admin.sessions.$sessionId.tsx` | Camp detail + toggle + QR       |
| `src/styles.css`                           | Design tokens + theme           |
| `docs/design-system.md`                    | MAD brand guidelines            |

## Future Roadmap

1. **Phase 4 — AI Image Generation** (needs OpenAI API key): DALL-E 3 generates a real dream card image from the child's 5 answers
2. **Phase 5 — WhatsApp Delivery** (needs Twilio): send card image to parent's phone after reveal
3. **Phase 6 — AWS Migration**: move from Supabase → AWS RDS, Cloudflare → AWS hosting
4. **Phase 7 — Deployment**: `npm run deploy` to Cloudflare Workers

See `PROJECT_ROADMAP.md` for full checklist.
