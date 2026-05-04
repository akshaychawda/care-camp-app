# Design System — Care Camps App

Approved 2026-05-04. Source of truth for all UI work.

---

## Brand Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--red` | `#C62828` | Primary actions, active states, progress bars, CTA buttons |
| `--red-dark` | `#8E0000` | Button hover, gradient end |
| `--red-light` | `#FFEBEE` | Icon backgrounds (light mode) |
| `--yellow` | `#F59E0B` | Secondary accent, "next child" success state |
| `--yellow-light` | `#FFF8E1` | Yellow icon backgrounds (light mode) |
| `--teal` | `#0D9488` | Tertiary / positive states (e.g. card generated ✓) |
| `--teal-light` | `#E0F2F1` | Teal icon backgrounds (light mode) |
| `--green` | `#25D366` | WhatsApp button only |

---

## Semantic Tokens (Light / Dark)

| Token | Light | Dark |
|-------|-------|------|
| `--bg` | `#FAF9F7` (warm off-white) | `#0F1117` |
| `--surface` | `#FFFFFF` | `#1A1F2E` |
| `--border` | `#E8E2D9` | `#252D3D` |
| `--text` | `#1A1A1A` | `#F1F0EE` |
| `--muted` | `#6B7280` | `#8A8F9C` |
| `--input-bg` | `#F5F3EF` | `#141820` |
| `--shadow` | `0 1px 4px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)` | `0 1px 4px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)` |

Dark mode via `@media (prefers-color-scheme: dark)` — system-responsive, no manual toggle.

---

## Typography

- **Font**: Inter (Google Fonts — weights 400, 500, 600, 700, 800, 900)
- **Scale**:
  - Display: 32px / weight 900
  - Heading: 24–28px / weight 800
  - Subheading: 20px / weight 800
  - Body: 15–16px / weight 400
  - Label: 13px / weight 600
  - Caption: 11–12px / weight 700 (uppercase + letter-spacing for section labels)

---

## Components

### Buttons
- **Primary**: `background: var(--red)`, white text, h-52px, border-radius 16px, font-weight 700
- **Outline**: transparent bg, `border: 2px solid var(--border)`, var(--text) color
- **Yellow**: `background: var(--yellow)`, `color: #1A1A1A`
- **WhatsApp**: `background: var(--green)`, white text

### Cards (Admin)
- `background: var(--surface)`, `border: 1px solid var(--border)`, `border-radius: 12px`, `padding: 20px`
- Section labels: 11px uppercase, letter-spacing 0.08em, color var(--muted)

### Inputs
- Height 52px (parent flow), height 44px (admin forms)
- `background: var(--input-bg)`, `border: 2px solid transparent`
- Focus: `border-color: var(--red)`, `background: var(--surface)`
- Border-radius: 14–16px (parent flow), 8–10px (admin)

### Badges
- Open: green text on dark green bg (`#064e3b` / `#34d399`)
- Closed: red text on dark red bg (`#450a0a` / `#f87171`)
- Pill shape: `border-radius: 999px`, `padding: 4px 12px`

### Progress Bar (parent flow)
- Height 4px, `border-radius: 99px`, fill color `var(--red)`

### MAD Logo Pill
- Red bg, white "MAD" text, font-weight 900, letter-spacing 0.08em

---

## Tailwind Mapping

These Tailwind CSS classes map to the design tokens. Use CSS variables for anything not covered by the default palette.

| Design token | Tailwind approximation |
|---|---|
| `--red #C62828` | `bg-red-700` / `text-red-700` |
| `--yellow #F59E0B` | `bg-amber-500` / `text-amber-500` |
| `--teal #0D9488` | `bg-teal-600` / `text-teal-600` |
| `--bg` (semantic) | Use CSS var directly in inline style or `bg-[#FAF9F7]` |

Prefer CSS custom properties for semantic tokens since they must switch in dark mode.

---

## Layout

### Parent Flow
- Phone frame: width 375px, border-radius 40px, border 8px solid var(--border)
- Inner padding: 24px sides
- Header: 64px min-height, back button + progress bar
- Bottom button: fixed at bottom of phone frame, 52px height

### Admin
- Max content width: 900px
- Grid: stats sidebar (1fr) + main content (2fr)
- Spacing: 24px page padding (mobile), 40px (desktop)

---

## Screen Inventory

| Screen | Type | Route |
|--------|------|-------|
| Welcome | Parent (phone) | `/` |
| Parent Info | Parent (phone) | `/` |
| Question (×5) | Parent (phone) | `/` |
| Loading | Parent (phone) | `/` |
| Card Reveal | Parent (phone) | `/` |
| Next Child | Parent (phone) | `/` |
| Camp Closed | Parent (phone) | `/` — shown when `is_open = false` |
| No Session | Parent (phone) | `/` — shown when `?session=` missing |
| Admin Dashboard | Admin (full) | `/admin` |
| New Camp Form | Admin (full) | `/admin/new` |
| Camp Created + QR | Admin (full) | `/admin/new` (success state) |
| Camp Detail | Admin (full) | `/admin/sessions/:id` |

---

## Approved Prototype

`public/prototype_design_system.html` — approved 2026-05-04. All new screens must match this prototype.
