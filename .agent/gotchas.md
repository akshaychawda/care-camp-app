# Gotchas — Care Camps App

Patterns that have silently broken things. Read before building.

---

## Theme / CSS

### Stale theme during feature build
**Pattern:** Build new UI screens before syncing CSS tokens to the approved design spec.
**Tell:** App looks "old" after audit — colors, fonts don't match prototype.
**Wrong:** Build features first, retheme at closeout.
**Right:** Sync `src/styles.css` tokens to `docs/design-system.md` as the *first* chunk of any UI phase.

### Missing dark mode tokens
**Pattern:** Define `:root` light tokens without a `@media (prefers-color-scheme: dark)` override block.
**Tell:** App renders broken (invisible text, white-on-white) when OS switches to dark mode.
**Wrong:**
```css
:root { --background: #FAF9F7; --foreground: #1A1A1A; }
/* no dark block */
```
**Right:**
```css
:root { --background: #FAF9F7; --foreground: #1A1A1A; }
@media (prefers-color-scheme: dark) {
  :root { --background: #0F1117; --foreground: #F1F0EE; }
}
```

### Class-based vs system dark mode
**Pattern:** Tailwind v4 `@custom-variant dark (&:is(.dark *))` means dark mode only activates when a `.dark` class is on a parent element — no script adds this automatically.
**Tell:** Dark mode never activates despite OS preference.
**Right:** Use `@custom-variant dark (@media (prefers-color-scheme: dark))` for system-responsive dark mode.

---

## Database

### Writing code before migration runs
**Pattern:** Add a new column to the TypeScript type and start coding against it before verifying the column exists in Supabase.
**Tell:** Runtime error "column X does not exist" on first real API call.
**Right:** Always verify migration before writing dependent TS:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'camp_sessions' AND column_name = 'is_open';
```
If 0 rows returned — stop, run migration first.

### `toSession(data, [])` — empty regs on create
**Pattern:** `createSession` calls `toSession(data, [])` because a newly-created camp has no registrations yet. Looks like a bug but is intentional.
**Tell:** Reader wonders why registrations array is empty.
**Note:** This is correct. `parent_count` and `card_count` will be 0 for a new camp. Not a bug.

---

## UI / Strings

### Partial term rename
**Pattern:** Rename a user-visible term (e.g. "session" → "camp") by scanning only the files you just edited.
**Tell:** Audit or user spots old term in an unedited screen.
**Right:** Before renaming, run `grep -rn "session" src/ --include="*.tsx"` and list every match. Address all of them in the rename chunk.

---

## Supabase Queries

### Embedded relation returns array, not object
**Pattern:** `.select("*, parent_registrations(*)")` returns `parent_registrations` as an array even for a single parent.
**Tell:** `data.parent_registrations.name` is undefined — it's `data.parent_registrations[0].name`.
**Right:** Always use `?? []` when accessing embedded relation arrays:
```typescript
const registrations: Registration[] = data.parent_registrations ?? [];
```

---

*Last updated: 2026-05-04*
