# Design System Specification: Caffe-YA POS

## 1. Overview & Creative North Star

**Creative North Star: "The Kinetic Atelier"**

Caffe-YA is a hybrid cafe + gaming center POS built for speed, clarity, and authority. In high-volume environments, "standard" UI feels cluttered or clinical. This design system rejects the "web-page" look in favor of a high-end, editorial POS experience. We treat the interface as a physical workspace—an "Atelier"—where efficiency is derived from spatial clarity, not just buttons.

By utilizing **Kinetic Layering**, we break the rigid grid. We use intentional asymmetry to draw the eye toward primary actions (like the checkout summary) while keeping secondary data (maintenance logs, audit trails) in a supportive, peripheral role. The aesthetic is "Precision-Utility": it feels like a professional tool used by an expert, utilizing bold typography and tonal depth rather than lines and boxes.

### Design Principles
1. **Clarity over decoration** — every visual element must serve operational speed
2. **Touch-first** — all primary interactions designed for 48px+ targets
3. **Bilingual-native** — Arabic RTL is not an afterthought; it's built into the foundation
4. **State visibility** — operators must always know: what's active, what's pending, what's broken
5. **Progressive disclosure** — show what's needed now, hide complexity until required

---

## 2. Colors: Tonal Architecture

This system abandons the 1px border. We define space through **Tonal Layering**, creating a sense of "carved out" areas within the interface.

### The "No-Line" Rule
Explicitly prohibited: 1px solid borders for sectioning. To separate a menu from an order summary, use a background shift from `surface` to `surface-container-low`. The edge of the color change is your boundary.

**Exception:** Dense data tables (accounting, audit logs, inventory lists) may use `outline_variant` at 15% opacity for row separation when tonal shifts alone become ambiguous at high density.

### Surface Hierarchy
Nesting is used to communicate "importance" and "containment":

| Layer | Token | Value | Usage |
|-------|-------|-------|-------|
| Base | `surface` | `#f8f9ff` | Application canvas |
| Sectioning | `surface-container-low` | `#eff4ff` | Sidebars, secondary panels |
| Actionable Cards | `surface-container-lowest` | `#ffffff` | Cards, buttons, clickable surfaces |
| Elevated | `surface-container-high` | `#dce9ff` | Secondary buttons, ghost elements |
| Floating Overlays | `surface-container-highest` | `#d2e4ff` | Modals, high-priority notifications |

### Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#565e74` | Primary CTAs, active states |
| `primary_dim` | `#4a5268` | Primary CTA hover/pressed |
| `on_primary` | `#f7f7ff` | Text on primary backgrounds |
| `secondary` | `#006e2f` | Available, paid, success |
| `secondary_container` | `#6bff8f` | Available status glow |
| `tertiary` | `#ba1b24` | Void, occupied, urgent |
| `tertiary_fixed_dim` | `#ec4142` | Maintenance, error urgency |
| `error` | `#9f403d` | Destructive actions, system failures |
| `warning` | `#c47a00` | Low stock, timer nearing limit |
| `outline` | `#477dbb` | Focus indicators, subtle separators |
| `outline_variant` | `#81b5f6` | Ghost borders at 15% opacity |

### Text Colors

| Token | Value | Usage |
|-------|-------|-------|
| `on_surface` | `#00345e` | Primary text, highest contrast |
| `on_surface_variant` | `#26619d` | Secondary details, metadata |
| `on_surface_disabled` | `#8fa8c4` | Disabled text, placeholders |

### The "Glass & Gradient" Rule
To elevate the experience from "generic software" to "bespoke tool," use **Glassmorphism** for floating order summaries or active table statuses. Use a background blur (12px–20px) on `surface` colors with 80% opacity.

**Constraint:** Glassmorphism is restricted to:
- Active order summary panel
- Gaming station status cards
- Shift close confirmation overlay

**Never** use glassmorphism on:
- Input fields
- Dense data tables
- Navigation elements
- Error states

**Signature Texture:** Primary CTAs should use a subtle linear gradient from `primary` (#565e74) to `primary_dim` (#4a5268) at a 135-degree angle to provide a tactile, "pressed" quality.

---

## 3. Typography: The Editorial Scale

We pair the technical precision of **Inter** with the structural elegance of **Manrope** for Latin text, and **IBM Plex Sans Arabic** (or **Cairo**) for Arabic text.

### Font Loading Strategy
```
Latin: Inter (body/labels) + Manrope (display/headlines)
Arabic: IBM Plex Sans Arabic (body/labels) + Cairo (display/headlines)
```

Both font families are loaded via `next/font` with `display: swap` and subset optimization for Arabic glyphs.

### Type Scale

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `display-lg` | 3.5rem | 700 | 1.1 | Total amounts, hero numbers |
| `display-md` | 2.5rem | 700 | 1.2 | Section totals, timer display |
| `headline-lg` | 2rem | 600 | 1.25 | Page titles |
| `headline-md` | 1.75rem | 600 | 1.3 | Category titles, card headers |
| `headline-sm` | 1.25rem | 600 | 1.35 | Subsection titles |
| `body-lg` | 1rem | 400 | 1.5 | Body text, descriptions |
| `body-md` | 0.875rem | 400 | 1.5 | Itemized lists, form fields |
| `body-sm` | 0.75rem | 400 | 1.4 | Metadata, timestamps |
| `label-md` | 0.75rem | 500 | 1.4 | Field labels, badges |
| `label-sm` | 0.625rem | 500 | 1.3 | Tags, system status |

### Arabic Typography Rules
- Arabic text requires **1–2px larger base size** than Latin for equivalent readability
- Line height should be **increased by 0.1** for Arabic body text
- Font weight should be **one step heavier** for Arabic headlines (e.g., 600 → 700)
- Numbers in Arabic context: use **Western numerals** (0-9) for prices and timers; Arabic numerals only for decorative labels

### Hierarchy Rules
1. Always lead with size and weight. A "Total" price should never be the same weight as the "Item Name."
2. Use `on_surface` (#00345e) for primary text and `on_surface_variant` (#26619d) for secondary details.
3. Timer values use `display-md` + monospace font for readability during rapid scanning.
4. Status labels use `label-md` + semantic color.

---

## 4. Elevation & Depth: Tonal Stacking

We avoid "shadow-heavy" UI. Depth is achieved through natural light logic.

### The Layering Principle
Instead of shadows, stack `surface_container_lowest` on top of `surface_container_low`. This creates a "Paper-on-Desk" effect that is easier on the eyes during long shifts.

### Ambient Shadows
Only for floating elements (e.g., a "New Order" pop-up, modal dialogs). Use a blur of 32px with 6% opacity of `on_surface` (#00345e). It should feel like a soft glow, not a dark drop-shadow.

### The "Ghost Border" Fallback
If high-glare environments require more definition, use `outline_variant` (#81b5f6) at 15% opacity. Never use 100% opacity.

**Allowed contexts for ghost borders:**
- Dense data tables (accounting, audit logs, inventory)
- Form field focus states
- Modal/dialog boundaries

---

## 5. Layout & Responsive Breakpoints

### Breakpoint System

| Token | Width | Target Device |
|-------|-------|---------------|
| `xs` | < 640px | Mobile (partner view, quick checks) |
| `sm` | 640–768px | Tablet portrait |
| `md` | 768–1024px | Tablet landscape (POS on iPad) |
| `lg` | 1024–1280px | Small desktop / laptop |
| `xl` | 1280–1536px | Standard desktop (primary POS station) |
| `2xl` | > 1536px | Large monitor (admin dashboard) |

### Layout Strategy by Context

#### POS Screen (xl / 2xl)
```
┌─────────────────────────────────────────────────────┐
│  Header: Shift info | Active orders | Language toggle│
├──────────────────────┬──────────────────────────────┤
│                      │                              │
│   Product Grid       │    Active Order Summary      │
│   (categories top)   │    (asymmetric, white bg)    │
│   Touch-friendly     │    Items, timer, total       │
│   cards              │    Checkout button           │
│                      │                              │
│                      │                              │
├──────────────────────┴──────────────────────────────┤
│  Quick actions: New Order | Expense | Transfer       │
└─────────────────────────────────────────────────────┘
```

#### POS Screen (md)
- Product grid becomes 3 columns
- Order summary moves to bottom sheet (collapsible)
- Quick actions become icon-only row

#### POS Screen (sm)
- Product grid becomes 2 columns
- Order summary is full-screen overlay triggered by floating button
- Navigation collapses to bottom tab bar

#### Admin Dashboard (lg+)
- Sidebar navigation (240px) + main content area
- Dense tables with horizontal scroll on smaller screens
- Charts/graphs scale proportionally

#### Admin Dashboard (md and below)
- Sidebar collapses to icon rail (72px)
- Tables become card-based list view
- Charts stack vertically

### RTL Layout Rules
1. **Never use `left`/`right` in Tailwind.** Always use `start`/`end`:
   - `ms-4` (margin-start), `me-4` (margin-end)
   - `ps-4` (padding-start), `pe-4` (padding-end)
   - `start-0`, `end-0` for positioning
2. **Sidebar navigation** flips to right side in Arabic mode
3. **Order summary panel** moves from right to left in RTL
4. **Status halos** (4px pill) move from left edge to right edge in RTL
5. **Icons with directional meaning** (arrows, chevrons) must flip in RTL
6. **Number alignment:** Prices and timers always align `end` (right in LTR, left in RTL)

---

## 6. Components: Tactile High-Efficiency

### Buttons

| Type | Min Height | Background | Text | Radius | Usage |
|------|-----------|------------|------|--------|-------|
| Primary | 56px | `primary` gradient | `on_primary` | `lg` (0.5rem) | Checkout, confirm, save |
| Secondary | 48px | `surface-container-high` | `on_surface` | `lg` | Cancel, back, secondary action |
| Semantic Success | 48px | `secondary` | `on_primary` | `lg` | Paid, available, confirm |
| Semantic Danger | 48px | `tertiary` | `on_primary` | `lg` | Void, delete, stop timer |
| Ghost | 48px | transparent | `on_surface_variant` | `lg` | Tertiary actions, links |
| Icon-only | 48×48px | varies | varies | `full` or `lg` | Toolbar actions |

**Touch target rule:** All interactive elements must have a minimum 48×48px hit area, even if visually smaller.

### Cards

**The "No-Divider" Rule:** Forbid 1px dividers between items. Use vertical spacing (16px) or alternate background shifts between `surface_container_lowest` and `surface-container-low` for every second item to create a zebra-stripe effect without the visual noise of lines.

**Card States:**
- **Default:** `surface-container-lowest` background
- **Hover:** subtle elevation via background shift to `surface-container-high`
- **Active/Selected:** `secondary_container` glow (4px status halo on start edge)
- **Disabled:** `surface` background + `on_surface_disabled` text

### Gaming Station / Resource Cards

| State | Visual Treatment |
|-------|-----------------|
| Available | `surface-container-lowest` + `secondary_container` subtle glow + status halo |
| Occupied | `surface-container-lowest` + `tertiary` status halo + running timer visible |
| Maintenance | `surface` + `tertiary_fixed_dim` text + status halo |
| Reserved | `surface-container-low` + `warning` status halo |

**Timer Display:** Uses `display-md` + monospace font. Format: `HH:MM:SS`. Color shifts to `warning` when approaching minimum charge threshold.

### Input Fields

**Interaction Style:** Understated. Use `surface_container_highest` (#d2e4ff) for the field background with a 2px bottom-bar of `outline` (#477dbb) upon focus. This keeps the interface feeling "open" rather than "boxed-in."

**States:**
- **Default:** `surface-container-highest` background, no border
- **Focus:** 2px bottom border `outline`, background unchanged
- **Error:** 2px bottom border `error`, `error` text label below
- **Disabled:** `surface` background, `on_surface_disabled` text

**Sizing:**
- **Large (56px height):** Primary data entry (amounts, names)
- **Medium (48px height):** Standard form fields
- **Small (40px height):** Inline edits, table cell edits

### Tables (Dense Data)

Tables are used for: accounting, audit logs, inventory, payroll, shift history.

**Design:**
- Header row: `surface-container-low` background, `label-md` text
- Data rows: alternate between `surface-container-lowest` and transparent
- Row hover: `surface-container-high` background
- Row click: opens detail view or modal
- **Ghost borders** allowed at 15% opacity for row separation
- Minimum row height: 48px
- Column headers are sticky on scroll

### Status Badges

| Type | Background | Text | Usage |
|------|-----------|------|-------|
| Success | `secondary` (15% opacity) | `secondary` | Paid, available, active |
| Warning | `warning` (15% opacity) | `warning` | Low stock, pending |
| Error | `tertiary` (15% opacity) | `tertiary` | Void, maintenance, overdue |
| Info | `outline` (15% opacity) | `outline` | Transferred, info |

### Modals & Overlays

- **Backdrop:** `surface-container-highest` at 80% opacity with 12px blur
- **Content:** `surface-container-lowest` background
- **Max width:** 640px for forms, 960px for detail views
- **Close:** X button + backdrop click + Escape key
- **Shift close modal:** Full-screen overlay (critical action)

### Permission Gate UI

Fields with field-level permissions use a consistent pattern:
- **Read access:** value displayed, no edit icon
- **No access:** field is hidden entirely
- **Write access:** editable input shown
- **Locked fields:** display value with lock icon, tooltip explaining required permission

---

## 7. State Patterns: Loading, Empty, Error

### Loading States
- **Page load:** skeleton matching the final layout shape
- **Data fetch:** inline spinner + "Loading..." label
- **Action in progress:** button shows spinner, disabled state
- **Timer sync:** subtle pulse animation on timer display

### Empty States
Every list/table/screen must have an empty state:
- **Icon:** relevant illustration (48×48px)
- **Title:** `headline-sm` — "No [items] yet"
- **Description:** `body-md` — brief explanation
- **Action:** primary button if user can create items

**Examples:**
- No active orders → "No open orders" + "Start New Order" button
- No products in category → "No items in this category"
- No shifts today → "No shifts opened yet" + "Open Shift" button

### Error States
- **Inline error:** red text below field, field bottom border `error`
- **Page error:** `error.tsx` per route segment — localized, not full-page crash
- **Network error:** toast notification + retry button
- **Shift error:** full-screen overlay blocking POS until resolved

---

## 8. Screen-Specific Design Notes

### POS Main Screen
- Product grid: 4 columns (xl), 3 columns (md), 2 columns (sm)
- Category tabs: horizontal scroll, pill-shaped, active state = `primary` background
- Order summary: asymmetric panel, always visible on xl+, collapsible on md/sm
- Timer display: only visible when a timed resource is assigned to the order
- Quick actions row: New Order, Expense from Drawer, Transfer Table

### Table/Resource Grid
- Visual grid layout: cards arranged by category
- Each card shows: name, status halo, timer (if occupied), hourly rate
- Click available → assign to order
- Click occupied → open active order
- Transfer button visible on occupied cards
- Color coding: green glow (available), red halo (occupied), grey (maintenance)

### Shift Open/Close
- **Open Shift:** centered card, float input, confirm button
- **Close Shift:** full-screen overlay, blind cash count entry, variance reveal after submit
- Alert if timed resources still running — must stop/transfer before close
- Manager approval prompt if variance exceeds threshold

### Admin: Users & Permissions
- Three-level permission UI grouped by module:
  1. Page access toggle
  2. Action permissions checkboxes
  3. Expandable field-level access (Read/Write per field)
- Visual hierarchy: module → page → action → field
- Role cards show assigned permission count

### Admin: System Settings
- Grouped by category: General, Gaming Rules, Inventory, Permissions
- Each setting: label, input/control, save indicator
- JSONB-backed settings: admin sees friendly form, not raw JSON
- Module flags: simple toggle switches with confirmation

### Accounting Screens
- Chart of Accounts: tree view, expandable by type
- Journal Entries: table with filter bar, click row for detail modal
- P&L / Balance Sheet: date range selector, summary cards, expandable sections
- Partner Dashboard: equity balance cards, ownership percentage, entry history table

### Reports & Dashboard
- Today's overview: 4 summary cards (sales, orders, active timers, shift status)
- Low stock alerts: inline banner at top if items below threshold
- Quick links: POS, Table Grid, Shift Close
- Charts: simple bar/line, no decorative elements

---

## 9. Do's and Don'ts

### Do:
- **Prioritize Touch:** Ensure all interactive elements have at least a 48px square hit area
- **Use "White Space" as a Tool:** If a screen feels cluttered, increase the gap between sections rather than adding a border
- **Color Context:** Use `error` (#9f403d) sparingly—only for destructive actions like "Delete Order" or " System Failure"
- **Test in Arabic early:** Build every screen with RTL from the start, not as a post-launch fix
- **Design for the worst lighting:** POS screens face glare, fingerprints, and bright overhead lights — prioritize contrast over subtlety
- **Show state clearly:** Operators must never guess if a timer is running, a shift is open, or a table is occupied

### Don't:
- **Don't use pure black (#000000):** It causes visual fatigue. Use `on_surface` (#00345e) for the highest contrast text
- **Don't use standard shadows:** Avoid the "2010s Material Design" look. Lean into background color shifts
- **Don't use 1px lines:** They clutter the high-speed workflow. Trust the tonal shifts to define the layout (except in dense data tables)
- **Don't overload the POS screen:** Every element on the POS must serve the checkout flow. Move admin/analytics elsewhere
- **Don't hide critical actions behind menus:** Checkout, stop timer, close shift must be one tap away
- **Don't use glassmorphism everywhere:** Restrict to order summary, station cards, and shift overlay only
- **Don't ignore empty states:** Every screen must handle the "nothing here yet" case gracefully

---

## 10. Signature Elements

### The "Status Halo"
Instead of a small dot for status, use a 4px vertical "pill" on the far start edge of a card using the semantic color:
- `secondary` for available
- `tertiary` for occupied
- `tertiary_fixed_dim` for maintenance
- `warning` for reserved

In RTL mode, the halo moves to the right edge automatically via `start` positioning.

### Asymmetric Summary
The "Order Summary" panel should be the only element using `surface_container_lowest` (#ffffff) to make it visually "pop" against the `surface` (#f8f9ff) background of the menu grid.

### Timer Pulse
When a timer is running, the seconds digit has a subtle opacity pulse (1s cycle). When approaching minimum charge threshold, the entire timer text shifts to `warning` color.

### The "Paper Stack" Effect
Cards and panels use tonal stacking to create depth:
- `surface-container-lowest` cards sit on `surface-container-low` panels
- This creates a natural "paper on desk" hierarchy without shadows
- Used in: product cards, order items, station cards, summary panels

---

## 11. Font & Asset Loading

### Fonts (via next/font)
```
Inter — body-md, body-sm, label-md, label-sm (Latin)
Manrope — display-lg, display-md, headline-lg, headline-md, headline-sm (Latin)
IBM Plex Sans Arabic — body-md, body-sm, label-md, label-sm (Arabic)
Cairo — display-lg, display-md, headline-lg, headline-md, headline-sm (Arabic)
JetBrains Mono — timer display, monospace numbers
```

### Icons
Use Lucide React icons. All icons must:
- Be 20×20px default
- Scale to 24×24px for navigation
- Flip directionally in RTL when meaning is directional (arrows, chevrons)

### Images
- Product images: stored on VPS, served via `/uploads/` path
- Fallback: generic icon placeholder if image missing
- Aspect ratio: 1:1 for product grid cards
- Resource images: optional, 16:9 for station cards
