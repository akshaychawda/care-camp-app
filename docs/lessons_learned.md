# Lessons Learned — Care Camps App

---

## 2026-05-04 — Phase 3.5

- **Apply design tokens before building UI.** If the CSS theme diverges from the approved design spec, every feature built in that session will need visual rework at audit. Sync theme first, then build.
- **Dark mode tokens must be explicitly defined.** Switching from class-based to system dark mode exposed that no dark token values existed. Always add `@media (prefers-color-scheme: dark)` overrides alongside the light `:root` block.
- **Grep all user-visible strings before a rename.** "Session → camp" rename missed one string in `NoSession`. A pre-rename grep list prevents this.
- **DB migration must be confirmed before writing dependent TypeScript.** The column existed when we coded against it, but only by luck (user ran it during build). Add a SQL verification step to the plan before any DB-dependent code chunk.
- **`getCampStatus` is not YAGNI** — a lightweight single-column query is intentionally cheaper than fetching full session + registrations just to check open/closed status on parent flow load.

---

## 2026-05-02 — Phases 1–3

- Commit after every phase — uncommitted work is invisible to worktrees and future sessions.
- Extract type-transformation helpers early — mappers drift silently when duplicated.
- UI components must be used consistently — never inline a component's equivalent in the same file.
- Verify git credentials with `--dry-run` before a real push.
- Supabase `.select("*, related_table(*)")` returns embedded arrays, not joined rows — map with `?? []`.
