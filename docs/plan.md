# Care Camps App — Implementation Plan

**Date:** 2026-05-02
**Status:** Ready to build
**PRD:** `docs/prd.md`

---

## Goal
Wire the Lovable-built UI to a real database so the app works end-to-end: coordinators can create camp sessions, parents can register, answers are saved, and the admin dashboard shows live data. AI image generation and WhatsApp delivery are deferred.

---

## Phase 1 — Database setup (Supabase)

**Goal:** Create the database that will store all camp and registration data.

**Why Supabase:** Free tier, easy setup via a web dashboard (no terminal needed), and it uses PostgreSQL — the same database engine MAD uses on AWS RDS. When MAD is ready to move to production infrastructure, this migrates cleanly.

### Steps

**1.1 — Create a Supabase project**
1. Go to supabase.com → sign up / log in
2. Click "New project" → name it `care-camps-app`
3. Choose a region close to India (Singapore is good)
4. Set a database password — save it somewhere safe
5. Wait for the project to provision (~2 minutes)

**1.2 — Create the database tables**

In Supabase: go to SQL Editor → New query → paste and run each block below.

```sql
-- Camp sessions: one row per Care Camp event
CREATE TABLE camp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  chapter TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parent registrations: one row per parent at a camp
CREATE TABLE parent_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES camp_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  area TEXT NOT NULL,
  child_name TEXT NOT NULL,
  card_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Child answers: the aspiration question responses
CREATE TABLE child_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES parent_registrations(id) ON DELETE CASCADE,
  question_index INTEGER NOT NULL,  -- 0 to 4
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**1.3 — Get the connection credentials**
1. In Supabase: go to Project Settings → API
2. Copy two values:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon public key** (a long string starting with `eyJ`)
3. Create a `.env` file in the root of the project:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```
4. Add `.env` to `.gitignore` (it should already be there — verify before committing)

**1.4 — Install the Supabase client**
In the terminal, inside the project folder:
```bash
npm install @supabase/supabase-js
```

**1.5 — Create the Supabase client file**
Create `src/lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Success criteria for Phase 1:**
- [ ] Supabase project exists and tables are created
- [ ] `.env` file exists with valid credentials
- [ ] `src/lib/supabase.ts` exists and imports without errors
- [ ] `.env` is in `.gitignore`

---

## Phase 2 — API layer

**Goal:** Create functions that read and write data to Supabase. The UI will call these functions instead of using mock data.

Create `src/lib/api.ts` — all database calls live here.

```typescript
import { supabase } from './supabase'

// --- Camp Sessions ---

export async function createSession(city: string, chapter: string, date: string) {
  const { data, error } = await supabase
    .from('camp_sessions')
    .insert({ city, chapter, date })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getSessions() {
  const { data, error } = await supabase
    .from('camp_sessions')
    .select(`
      *,
      parent_registrations(count)
    `)
    .order('date', { ascending: false })
  if (error) throw error
  return data
}

export async function getSession(id: string) {
  const { data, error } = await supabase
    .from('camp_sessions')
    .select(`
      *,
      parent_registrations(*)
    `)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

// --- Registrations ---

export async function registerParentAndChild(params: {
  sessionId: string
  parentName: string
  phone: string
  city: string
  area: string
  childName: string
  answers: string[]  // array of 5 answers in order
}) {
  // Insert parent registration
  const { data: reg, error: regError } = await supabase
    .from('parent_registrations')
    .insert({
      session_id: params.sessionId,
      name: params.parentName,
      phone: params.phone,
      city: params.city,
      area: params.area,
      child_name: params.childName,
    })
    .select()
    .single()
  if (regError) throw regError

  // Insert child answers
  const answers = params.answers.map((answer, i) => ({
    registration_id: reg.id,
    question_index: i,
    answer,
  }))
  const { error: ansError } = await supabase
    .from('child_answers')
    .insert(answers)
  if (ansError) throw ansError

  return reg
}

export async function markCardGenerated(registrationId: string) {
  const { error } = await supabase
    .from('parent_registrations')
    .update({ card_generated: true })
    .eq('id', registrationId)
  if (error) throw error
}
```

**Success criteria for Phase 2:**
- [ ] `src/lib/api.ts` exists with all five functions
- [ ] No TypeScript errors on save

---

## Phase 3 — Wire frontend to real data

**Goal:** Replace all mock data with real API calls. Three areas to update.

### 3.1 — Admin dashboard (session list)

Update `src/routes/admin.index.tsx`:
- On load, call `getSessions()` from `src/lib/api.ts`
- Replace the `SESSIONS` import from `admin-data.ts`
- Show a loading state while fetching
- Show an error message if the fetch fails

### 3.2 — Session detail

Update `src/routes/admin.sessions.$sessionId.tsx`:
- On load, call `getSession(sessionId)` from `src/lib/api.ts`
- Replace the mock `SAMPLE_REGISTRATIONS` data
- Show registrations from the real database

### 3.3 — Create new session

Update `src/routes/admin.new.tsx`:
- On form submit, call `createSession(city, chapter, date)`
- After creation, generate a QR code for the session URL
- Session URL format: `https://<domain>/?session=<session-id>`
- Use the `qrcode` npm package: `npm install qrcode @types/qrcode`
- Show the QR code on a confirmation screen with a "Copy Link" button

### 3.4 — Parent flow (DreamFlow)

Update `src/components/DreamFlow.tsx`:
- Read the `session` query param from the URL (`?session=<id>`)
- If no session param found, show an error: "This link is not linked to a valid camp session. Please ask your volunteer for the correct link."
- On final question submission, call `registerParentAndChild()` with all collected data
- Pass the registration ID forward to the card reveal screen
- On card reveal, the "Send to WhatsApp" button is temporarily replaced with a "Download Card" button only (WhatsApp deferred)
- Add a "Next Child →" button that clears all form state but keeps the session ID in the URL

**Success criteria for Phase 3:**
- [ ] Admin dashboard shows real sessions from Supabase
- [ ] Creating a new session saves to database and shows a QR code
- [ ] Parent flow reads session ID from URL and saves registration + answers to database
- [ ] "Next Child" resets form without losing session context
- [ ] Session detail shows real registrations

---

## Phase 4 — AI image generation (deferred)

**When to start:** After Phase 3 is working end-to-end and has been tested at a real event.

**What's needed:**
- A Replicate account and API key (replicate.com) — or OpenAI DALL-E 3 key
- A backend function that takes the child's answers, builds a prompt, calls the image API, and returns an image URL
- Update the card reveal screen to show the real generated image
- Update `markCardGenerated()` to also store the image URL

---

## Phase 5 — WhatsApp delivery (deferred)

**When to start:** After AI image generation is working.

**What's needed:**
- A Twilio account with WhatsApp Business API access
- A backend function that sends the card image to the parent's phone number
- Update the card reveal screen to show delivery status

---

## Phase 6 — AWS migration (deferred)

**When to start:** When MAD's tech team is ready to take this to production infrastructure.

**What's involved:**
- **Database**: Export Supabase schema → create identical tables on AWS RDS (PostgreSQL). Update the connection string in environment variables. App code does not change.
- **Hosting**: The app currently deploys via Cloudflare Workers. Options for AWS: AWS Amplify (simplest for a React app), or containerise and deploy to ECS/Fargate (more control). MAD's tech team should lead this step.
- **Environment variables**: All secrets (DB credentials, API keys) move to AWS Secrets Manager or SSM Parameter Store.
