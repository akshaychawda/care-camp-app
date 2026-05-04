# BUGS.md — Care Camps App

## Active

| ID | File | Description | Severity | Phase |
|----|------|-------------|----------|-------|
| B1 | `src/routes/admin.new.tsx:117` | QR code error silently freezes at "Generating QR…" with no user feedback | Low DEBT | Phase 4 |
| B2 | `src/routes/admin.new.tsx:128` | WhatsApp share builds link with no null-check on session date — breaks silently if date is malformed | Low DEBT | Phase 4 |
| B3 | `src/lib/supabase.ts` | No explicit error thrown if `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` env vars are missing — fails cryptically at runtime | Low DEBT | Phase 4 |
| B4 | `src/routes/admin.index.tsx:114-186` | Mobile and desktop session rows duplicate date formatting logic | Low DEBT | Phase 4 |
| B5 | `src/lib/api.ts:55` | `toSession(data, [])` in `createSession` passes empty regs array — reads as if newly-created camp has no registrations (it doesn't, but the intent is non-obvious; a comment or named constant would help) | Low DEBT | Phase 4 |
| B6 | `src/routes/admin.sessions.$sessionId.tsx:43` | QR code generation logic duplicated between `CampQR` component and `Confirmation` in `admin.new.tsx:157` — different styling but same `QRCode.toDataURL` pattern | Low DEBT | Phase 4 |

## Resolved

| ID | File | Description | Fixed |
|----|------|-------------|-------|
| B0-a | `src/lib/api.ts` | `toSession` transform duplicated in `getSessions` and `getSession` — extracted to shared helper | 2026-05-02 |
| B0-b | `src/routes/admin.sessions.$sessionId.tsx:136` | CardYesNo logic inlined in desktop table instead of using component | 2026-05-02 |
