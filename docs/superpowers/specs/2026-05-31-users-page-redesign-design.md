# Users Page Redesign — Design Spec

**Date:** 2026-05-31
**Status:** Approved

---

## Problem

The current Users page has two tabs (Pending Requests / All Users) which hides the full picture. Admins can't easily answer "which COs are pending?" or "how many CHOs are active?" without switching tabs and cross-referencing mentally. The tab structure also buries invited users in the All Users tab with no visual priority.

---

## Design

### Layout

Single unified list. No tabs. Two filter rows at the top of the page, then a result summary line, then the user list.

### Filter Row 1 — Status

Pill buttons: **All · Pending `n` · Invited `n` · Active `n` · Disabled `n`**

- Counts update reactively as the other filter changes
- "All" selected by default
- Active pill styled with MAD red (#C62828)
- Pending pill has amber border/text when unselected
- Only one status pill active at a time

### Filter Row 2 — Role

Pill buttons: **All roles · MAD Employee · CO `n` · CHO `n`**

- Counts show total users in that role (regardless of status filter)
- "All roles" selected by default
- Only one role pill active at a time

### Result Summary Line

Below both filter rows:
> Showing **X users** · [status label] · [role label]

Uses muted text. Updates reactively.

### Sort Order

1. Pending
2. Invited
3. Active
4. Disabled
5. Rejected

Within each group: alphabetical by `full_name`.

### User Row

```
[Avatar] [Name]              [Actions]
         [email] [role badge] [status badge]
```

- **Avatar:** 34px circle, initial letter, colour-coded by status (amber=pending, blue=invited, green=active, red=disabled)
- **Name:** 14px semibold
- **Email:** 12px muted. If not ending in `@makeadiff.in`, show amber "non-MAD email" badge inline
- **Role badge:** colour-coded pill — MAD Employee (blue), CO (purple), CHO (pink)
- **Status badge:** colour-coded pill — Pending (amber), Invited (blue), Active (green), Disabled (red)

### Actions by Status

| Status | Actions |
|--------|---------|
| Pending | "Assign role…" dropdown (blank default, required to unlock Approve) + Approve button + Reject button |
| Invited | Resend button + Cancel button |
| Active | Change role button (opens inline dropdown) + Disable button |
| Disabled | Enable button |
| Rejected | Reinvite button |

Approve button is disabled until a role is selected from the dropdown. Approve button fires `approveUser(id, role)`. All actions show a loading spinner while in-flight and toast on success/failure.

---

## Component Changes

### `src/routes/admin.users.tsx`

- Remove `tab` state and tab button UI entirely
- Add `statusFilter: UserStatus | "all"` state (default `"all"`)
- Add `roleFilter: UserRole | "all"` state (default `"all"`)
- Replace `getPendingUsers()` + `getAllUsers()` calls with a single `getAllUsers()` call that returns all statuses
- Compute `filtered` array from `users` applying both filters
- Compute `sorted` array: sort by status order (pending→invited→active→disabled→rejected), then alphabetical within group
- Compute pill counts from full unfiltered `users` array (so counts don't change as you filter)
- Replace `PendingRow` + `UserRow` + `InvitedRow` with a single `UserRow` component that renders contextual actions based on `user.status`

### `src/lib/api.ts`

- Update `getAllUsers()` to remove the `.neq("status", "pending")` filter — return all statuses
- Remove `getPendingUsers()` (no longer needed; pending users surface via filter)
- Update `getPendingCount()` to remain for the sidebar badge (still needed)

### `src/components/admin/AdminLayout.tsx`

- Sidebar pending count badge remains unchanged — still uses `getPendingCount()`

---

## Data Flow

```
load() → getAllUsers() → users[]
                              ↓
              statusFilter + roleFilter
                              ↓
                        filtered[]
                              ↓
                  sort by status order + alpha
                              ↓
                        sorted[] → render
```

Pill counts computed from `users[]` (pre-filter) so they always reflect total counts.

---

## Error Handling

- Load failure: show error state with retry button (same as current)
- Action failure: toast error, no state change
- Empty filtered result: "No users match these filters." with a "Clear filters" link

---

## Out of Scope

- Search/text filter (not needed for current team size)
- Bulk actions
- Export
- Pagination (team is small enough for a single list)
