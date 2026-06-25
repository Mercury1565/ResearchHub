---
name: researchhub-design
description: >
  ResearchHub UI design system and styling guide. Use this skill whenever
  writing or reviewing any CSS, Tailwind classes, component styling, layout
  decisions, or visual design choices for the ResearchHub frontend. Trigger
  this skill any time the user mentions "style", "design", "color", "font",
  "spacing", "layout", "look and feel", "UI", "component appearance",
  "dark mode", or asks how something should look. Also use when building any
  new component or page — always check this skill before writing Tailwind classes.
---

# ResearchHub Design System

ResearchHub's visual language is **Notion-inspired minimalism**: a calm, near-white
workspace where the content (the research, the PDF, the annotations) is always
the loudest thing on screen. The UI recedes. Chrome is invisible until needed.
Nothing competes with the work.

---

## Design Principles

**Content first.** The PDF and the user's notes are the product. Every UI element
earns its place by serving them — sidebars, toolbars, and panels must not draw
attention to themselves.

**Calm over clever.** No gradients, no drop shadows stacked three deep, no
animated transitions that last more than 150 ms. If adding something makes the
screen busier, remove it.

**Density without clutter.** Notion packs a lot into a small space through
consistent, tight rhythm — not by shrinking things, but by removing all the
padding that doesn't earn its keep.

**Monochrome first, accent sparingly.** Build every UI surface in grays. Reach for
the accent color only to communicate something: a selected state, a call to action,
an active highlight. Never use it decoratively.

---

## Color Palette

These are the only colors in the product. Do not introduce new ones without updating
this skill.

```
Background
  --color-bg          #FFFFFF   Page / main content background
  --color-bg-subtle   #F7F7F5   Sidebar, panels, hover states (Notion's warm off-white)
  --color-bg-raised   #EFEEEC   Pressed states, active sidebar items

Borders & Dividers
  --color-border      #E3E2DF   Standard dividers (light, barely visible)
  --color-border-strong #C8C7C4 Emphasized borders (e.g. panel edges on focus)

Text
  --color-text-primary   #1A1A1A  Body text, headings — near-black, not pure black
  --color-text-secondary #6B6B6B  Labels, placeholders, metadata
  --color-text-tertiary  #A0A09A  Disabled, timestamps, de-emphasized captions

Accent (use sparingly — only for interaction feedback)
  --color-accent         #2383E2  Selected items, active links, primary CTA (Notion blue)
  --color-accent-subtle  #EDF3FC  Accent backgrounds (selected row tint, focus ring fill)

Highlight (annotation-specific)
  --color-highlight      rgba(255, 212, 0, 0.30)  PDF text highlight (muted yellow)
  --color-highlight-active rgba(255, 212, 0, 0.55) Hovered / selected highlight

Destructive
  --color-danger         #E03E3E  Delete confirmations only
  --color-danger-subtle  #FDF2F2  Danger action background tint
```

**What to avoid:**
- No `blue-500`, `indigo-600`, `purple-*`, or any saturated UI chrome
- No gradients anywhere in the application shell
- No `black` (`#000`) — use `--color-text-primary` instead
- No colored sidebars, headers, or nav bars

---

## Tailwind Mapping

Always use these Tailwind classes (they map to the palette above via config):

```
Background
  bg-white              → --color-bg
  bg-[#F7F7F5]          → --color-bg-subtle  (sidebar, panels)
  bg-[#EFEEEC]          → --color-bg-raised  (active/pressed)

Borders
  border-[#E3E2DF]      → --color-border
  border-[#C8C7C4]      → --color-border-strong

Text
  text-[#1A1A1A]        → --color-text-primary
  text-[#6B6B6B]        → --color-text-secondary
  text-[#A0A09A]        → --color-text-tertiary

Accent
  text-[#2383E2]        → --color-accent
  bg-[#EDF3FC]          → --color-accent-subtle
  border-[#2383E2]      → accent border

Tip: add these as theme extensions in tailwind.config.ts to avoid
repeating hex values — e.g. colors.surface, colors.accent, etc.
```

---

## Typography

```
Font family   Inter (system fallback: ui-sans-serif, system-ui, sans-serif)
              Load via: <link> to fonts.googleapis.com/css2?family=Inter:wght@400;500;600

Scale (rem)
  text-xs     0.75rem / 12px   Timestamps, captions, badge labels
  text-sm     0.875rem / 14px  Body text, sidebar items, note content  ← default
  text-base   1rem / 16px      Document titles, panel headers
  text-lg     1.125rem / 18px  Page-level headings (rare)

Weights
  font-normal  400   Body copy, sidebar labels
  font-medium  500   Active states, item titles, button labels
  font-semibold 600  Section headings only — use very sparingly

Line height
  leading-snug (1.375)  for dense UI text
  leading-normal (1.5)  for note content / readable prose

Letter spacing
  tracking-normal for body
  tracking-wide + uppercase + text-xs for section eyebrows
  (e.g. "PROJECTS", "NOTES") — Notion's main structural label pattern
```

**Sticky note fonts** are the only exception to Inter — see the Annotation section below.

---

## Spacing & Layout Rhythm

Use a **4 px base grid**. Tailwind's default scale maps cleanly — stick to
multiples of 1 (4 px), 1.5 (6 px), 2 (8 px), 3 (12 px), 4 (16 px), 6 (24 px).

```
Sidebar item padding      px-2 py-1   (8px / 4px)
Section label padding     px-2 mb-1   with mt-4 before new sections
Panel internal padding    p-4         (16px uniform)
Panel header              px-4 py-2.5 border-b
Input / textarea padding  px-3 py-2
Button padding            px-3 py-1.5 (small) | px-4 py-2 (default)
Dividers                  border-b border-[#E3E2DF] — never use <hr>
```

---

## Component Patterns

### Sidebar item (project / document)

```tsx
// Normal
<button className="w-full flex items-center gap-2 rounded px-2 py-1
  text-sm text-[#1A1A1A] hover:bg-[#EFEEEC] transition-colors duration-100">

// Active / selected
<button className="... bg-[#EFEEEC] font-medium text-[#1A1A1A]">
```

No colored left border, no bold-on-active text color change — just the background tint.
Active items get `font-medium`, nothing else.

### Section eyebrow label

```tsx
<p className="px-2 mb-1 mt-4 text-xs font-medium uppercase tracking-wider text-[#A0A09A]">
  Projects
</p>
```

### Buttons

```tsx
// Primary (use only for one CTA per view)
<button className="rounded px-3 py-1.5 text-sm font-medium
  bg-[#2383E2] text-white hover:bg-[#1a6bbf] transition-colors duration-100">

// Secondary / ghost (most actions)
<button className="rounded px-3 py-1.5 text-sm font-medium
  text-[#1A1A1A] hover:bg-[#EFEEEC] transition-colors duration-100">

// Danger
<button className="rounded px-3 py-1.5 text-sm font-medium
  text-[#E03E3E] hover:bg-[#FDF2F2] transition-colors duration-100">
```

No box shadows on buttons. No border on ghost buttons. Border-radius: `rounded` (4 px).

### Input / Textarea

```tsx
<input className="w-full rounded border border-[#E3E2DF] bg-white
  px-3 py-2 text-sm text-[#1A1A1A] placeholder:text-[#A0A09A]
  focus:border-[#2383E2] focus:outline-none focus:ring-2 focus:ring-[#EDF3FC]
  transition-colors duration-100" />
```

Focus ring: `ring-2 ring-[#EDF3FC]` (the accent-subtle tint) — visible but not jarring.

### Panel / Card surface

```tsx
// A panel that sits slightly raised from the page
<div className="rounded border border-[#E3E2DF] bg-white">

// A subtly tinted container (sidebar bg, tool area)
<div className="bg-[#F7F7F5]">
```

No `shadow-*` utilities on any application shell surfaces.
Reserve `shadow-sm` only for floating elements (tooltips, dropdowns, modals).

### Tooltip / Dropdown

```tsx
<div className="rounded border border-[#E3E2DF] bg-white shadow-sm
  text-sm text-[#1A1A1A] py-1">
  <button className="w-full px-3 py-1.5 text-left hover:bg-[#F7F7F5]">…</button>
</div>
```

### Empty states

```tsx
<div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
  <p className="text-sm text-[#6B6B6B]">No documents yet</p>
  <p className="text-xs text-[#A0A09A]">Upload a PDF to get started</p>
</div>
```

No illustrations, no giant icons, no decorative dividers.

---

## Annotation / Sticky Note Styling

Sticky notes are the one place the UI can have a little personality —
they live inside the PDF world, not the application chrome.

```tsx
// Note card
<div className="rounded border border-[#E3E2DF] bg-[#FEFCE8]
  shadow-sm p-3 text-sm">
```

Background is a very pale yellow (`#FEFCE8` — Tailwind's `yellow-50`) to evoke
physical paper without screaming. The border keeps it grounded.

**Font classes for note content** (the only non-Inter text in the app):

```
font-style: 'sans-serif'    → font-sans (Inter)
font-style: 'caveat'        → font-caveat
font-style: 'indie-flower'  → font-indie
font-style: 'patrick-hand'  → font-patrick

font-size: 'small'   → text-xs
font-size: 'medium'  → text-sm
font-size: 'large'   → text-base
```

The font picker and size controls use ghost button style — no visible background
until hovered. Selected option gets `bg-[#EFEEEC] font-medium`.

---

## PDF Viewer Chrome

The PDF viewer area is the most minimal surface in the app — the document
itself is the only visual element.

```
Viewer background   bg-[#F7F7F5]   (same as sidebar — recedes behind the PDF)
PDF page drop       shadow-sm border border-[#E3E2DF] bg-white
Page number label   text-xs text-[#A0A09A] text-center py-1
Toolbar (zoom/nav)  bg-white border-b border-[#E3E2DF] px-4 py-2
                    All toolbar actions use ghost buttons
```

No floating toolbar over the document. Keep controls in a fixed bar above the canvas.

---

## Interaction & Motion

```
Transition duration    100–150 ms only
Easing                 ease-in-out (Tailwind default)
What to animate        background-color, border-color, color, opacity, transform
What NOT to animate    width, height, layout shifts, box-shadow changes

Hover feedback         Background tint change only (no scale, no lift)
Active/pressed         bg-[#EFEEEC] (one step darker than hover) for 80 ms
Focus                  2px ring in --color-accent-subtle; never remove outline entirely
```

Use `transition-colors duration-100` on interactive elements. That's it.

---

## What to Never Do

- Never use `shadow-md`, `shadow-lg`, or `shadow-xl` on any panel or card in the main layout
- Never use colored backgrounds (`blue-*`, `indigo-*`, `purple-*`) on any chrome element
- Never use `font-bold` (700) — `font-semibold` (600) is the heaviest weight allowed
- Never add borders to buttons — ghost buttons have no border
- Never use `rounded-full` on rectangular UI elements (pills on tags are OK)
- Never put more than one accent-colored element in the same view without a strong reason
- Never use `text-white` on anything except primary buttons and the app logo
- Never animate layout properties (`width`, `height`, `padding`, `margin`)
