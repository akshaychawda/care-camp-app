---
title: Care Camps App — PRD v1
status: draft
created: 2026-05-02
last_updated: 2026-05-02
version: v1 — simulation-tested, ready for planning
---

# Care Camps App — Product Requirements Document (v1)

---

## Problem / Opportunity

MAD needs a scalable, repeatable way to create an immediate value moment at Care Camp entry events. The current alternative — door-to-door outreach — does not scale. Schools are the trusted access point, but the relationship MAD needs to build is directly with parents, not institutions. Care Camps are that first community entry event. The app makes that event engaging, easy to run with minimal training, and leaves parents with something tangible and shareable — turning a one-time event into word-of-mouth growth.

---

## Goal

A mobile web app that guides a parent/child pair through a structured aspiration-capture flow, generates an AI image card visualising the child's dream, delivers it to the parent's WhatsApp, and gives MAD coordinators visibility into what is happening across cities and chapters.

---

## Target users

| User | Role |
|------|------|
| **Parent** | Primary operator — holds the phone, enters data, receives the card |
| **Child** | Subject — answers aspiration questions (with parent's help) |
| **Volunteer / Staff** | Facilitator — guides parent and child through the flow at the event |
| **MAD Coordinator / Admin** | Creates camp sessions; monitors activity via dashboard |

---

## Core requirements

### 1. Access
- Opens in a mobile browser — no app install required
- Entry point: short link or QR code tied to a specific camp session
- QR code generated when coordinator creates the session; coordinator shares it with volunteers via WhatsApp or email before the event

### 2. Welcome screen
- First screen must be welcoming and contextual — not a form
- Shows: "Welcome to [Child's Name]'s Dream Camp" or similar warm framing
- Purpose: establish trust and excitement before any data entry begins

### 3. Parent registration
- Captures: Name, Phone Number, City, Area (labelled "Neighbourhood / Area" with a placeholder example e.g. "Koregaon Park, Baner")
- Age not collected in v1 — no downstream use case
- City pre-filled from camp session if available; parent can edit
- Phone number is the unique identifier — if number already exists, update record rather than create duplicate

### 4. Child aspiration flow
- Child's name captured on a dedicated screen
- 4–5 structured questions, one per screen, about dream / career aspiration
- Questions must work for ages 6–14; a one-word answer must be sufficient to produce good output
- Typed, English, v1; questions hardcoded for v1
- Each question has a visible sub-prompt hint beneath it — a short, plain-language nudge so children ages 6–14 can answer without volunteer translation
- Example question set with sub-prompts:
  - *What do you want to be when you grow up?* → hint: *"Doctor, cricketer, teacher, astronaut… anything!"*
  - *What is your favourite subject or activity?* → hint: *"Maths, drawing, dancing, football…"*
  - *What problem would you like to fix in the world?* → hint: *"Pollution, hunger, making people happy…"*
  - *Who is someone you look up to?* → hint: *"A family member, a sports star, a character from a story…"*
  - *Describe yourself in one word.* → hint: *"Brave, curious, funny, kind…"*

### 5. AI image card generation
- Input: child's name + answers to aspiration questions
- Output: visually appealing image card + one-line description of the child's dream + MAD logo
- Named loading screen during generation: *"We're painting [Child's name]'s dream…"* with a simple animation
- Target generation time: under 15 seconds on a mid-range Android on standard mobile data
- Prompt engineering must be robust enough that a one-word answer still produces a meaningful, high-quality image
- **One-line description fallback template**: if the AI cannot synthesise a meaningful sentence from the answers, default to: *"[Child's name] dreams of becoming a [primary aspiration answer]."* — always better than a blank or a generic line

### 6. Card delivery
- **Card reveal screen** shown first — parent and child see the card together
- Screen prompt: *"Check your WhatsApp — your card is on its way!"* so parent knows to look for it
- **Primary delivery**: card sent to parent's WhatsApp via WhatsApp Business API
- **Secondary**: download button visible at all times on the reveal screen
- If WhatsApp delivery fails: surface clear error message; download button remains available; volunteer can download and forward manually
- WhatsApp sender must be recognisable (MAD-branded WhatsApp Business account, not an unknown number)

### 7. Session continuity — "Next child" reset
- "Next child" button on card reveal screen resets the flow to the parent registration step
- Camp session context (city, chapter, date, session ID) is preserved across the full 30–50 parent queue
- Session does not expire until coordinator explicitly closes it or it is manually ended

### 8. Admin dashboard
- Internal URL, no login required for v1
- View: list of all camp sessions, filterable by city and MAD chapter
- Per session: date, location, number of parents registered, number of cards generated
- Capacity expectation: 30–50 parents per session

---

## User flow (summary)

```
Coordinator creates camp session (city, chapter, date)
        ↓
Coordinator shares QR code / link with volunteers (WhatsApp / email)
        ↓
Volunteer shows QR to parent at the event
        ↓
Parent opens link → Welcome screen
        ↓
Parent enters: Name, Age, Phone Number, City (pre-filled), Neighbourhood
        ↓
Parent enters child's name
        ↓
Child answers 4–5 aspiration questions (one per screen, volunteer guides)
        ↓
Named loading screen: "We're painting [Name]'s dream…"
        ↓
Card reveal screen — parent and child see the card together
        ↓
WhatsApp delivery triggered + "Check your WhatsApp!" prompt shown
        ↓
Parent receives card on WhatsApp; download option also available
        ↓
Volunteer taps "Next child" → session context preserved, form resets
        ↓
Parent leaves with card — shares with family / WhatsApp groups
```

---

## Success criteria

- [ ] A volunteer with zero prior training can guide a parent through the complete flow in under 3 minutes
- [ ] Image card is delivered to parent's WhatsApp before they leave the event
- [ ] Flow works on a mid-range Android phone on a standard mobile data connection
- [ ] Named loading screen ("We're painting [Name]'s dream…") plays during generation; no blank wait screen
- [ ] "Next child" reset preserves camp session; coordinator does not need to re-create session between parents
- [ ] MAD admin can see camp-level data (registrations, cards generated) in the dashboard
- [ ] App does not require a login or account from the parent

---

## Out of scope — v1

| Feature | Deferred to |
|---------|-------------|
| Voice input for aspiration questions | v2 |
| Languages other than English | v2 |
| Native mobile app | v2 |
| DPDP / explicit consent flows | v2 |
| Structured child data storage and profiling | v2 |
| Volunteer management / login / assignment | v2 |
| Configurable question sets per event | v2 |
| Admin dashboard login / authentication | v2 |
| SMS / email fallback for card delivery | v2 |

---

## Assumptions

- Parents have WhatsApp installed (standard in Indian urban / semi-urban context)
- An internet connection is available at the event venue
- 30–50 parents per camp session, handled one at a time
- The app runs on the parent's own phone (BYOD)
- Coordinator is responsible for creating the session and distributing the QR code before the event

---

## Risks

| Risk | Mitigation |
|------|-----------|
| AI image generation too slow | Test latency early; engaging named loading screen buys time; explore caching common archetypes |
| Low-quality AI output breaks the magic moment | Robust prompt engineering; test with one-word answers; quality bar must survive "Doctor", "Teacher", "Cricketer" |
| WhatsApp message looks like spam from unknown number | Use MAD-branded WhatsApp Business account; prompt on card reveal screen sets expectation |
| WhatsApp Business API setup complexity and cost | Spike in Phase 1; evaluate Twilio / 360dialog vs direct API; budget per-message cost at 50 parents/camp |
| Duplicate parent records across multiple camps | Phone number as unique identifier; detect on entry and update rather than duplicate |
| Session context lost on phone sleep / browser refresh | Persist session ID in URL params or localStorage; restore on reload |

---

## Resolved questions

- [x] **Aspiration questions**: Hardcoded for v1. Editable via admin dashboard in v2.
- [x] **Admin dashboard auth**: Simple internal URL, no login for v1.
- [x] **No-WhatsApp fallback**: Download option shown at all times; volunteer can download and forward.
- [x] **Branding**: MAD logo on every generated card.
- [x] **Capacity**: 30–50 parents per camp session.
