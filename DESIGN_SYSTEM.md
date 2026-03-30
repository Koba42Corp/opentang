# OpenTang — Design System
**Version:** 0.1.0  
**Status:** Approved

---

## Brand Identity

**Name:** OpenTang  
**Tagline:** *Your stack. Your rules.*  
**Personality:** Professional, confident, approachable. Not corporate. Not toy.

---

## Color Palette

### Primary — Orange Fire
The core OpenTang identity color. Used for CTAs, active states, progress, highlights.

| Token | Hex | Usage |
|---|---|---|
| `--color-primary-900` | `#7C2D00` | Deep shadow, pressed states |
| `--color-primary-800` | `#9A3900` | Dark hover states |
| `--color-primary-700` | `#C24E00` | Strong accent |
| `--color-primary-600` | `#EA6300` | Primary brand orange |
| `--color-primary-500` | `#F97316` | **Main CTA / active** |
| `--color-primary-400` | `#FB923C` | Hover states, highlights |
| `--color-primary-300` | `#FDBA74` | Soft accents, badges |
| `--color-primary-200` | `#FED7AA` | Backgrounds, chips |
| `--color-primary-100` | `#FFF7ED` | Surface tints |

### Neutrals — Dark Slate
Dark-first UI. Clean, modern, techy without being oppressive.

| Token | Hex | Usage |
|---|---|---|
| `--color-bg-deep` | `#0A0A0B` | App background |
| `--color-bg-base` | `#111113` | Primary surface |
| `--color-bg-elevated` | `#1A1A1E` | Cards, panels |
| `--color-bg-overlay` | `#242428` | Modals, dropdowns |
| `--color-border` | `#2E2E34` | Dividers, borders |
| `--color-border-subtle` | `#1E1E22` | Subtle separators |

### Text

| Token | Hex | Usage |
|---|---|---|
| `--color-text-primary` | `#F8F8F8` | Headlines, labels |
| `--color-text-secondary` | `#A0A0A8` | Descriptions, meta |
| `--color-text-muted` | `#606068` | Placeholder, disabled |
| `--color-text-inverse` | `#0A0A0B` | Text on orange buttons |

### Status Colors

| Token | Hex | Usage |
|---|---|---|
| `--color-success` | `#22C55E` | ✅ Installed, healthy |
| `--color-warning` | `#EAB308` | ⚠️ Optional, degraded |
| `--color-error` | `#EF4444` | ❌ Failed, error |
| `--color-info` | `#3B82F6` | ℹ️ Info, in-progress |
| `--color-pending` | `#F97316` | ⏳ Installing (orange pulse) |

---

## Typography

| Role | Font | Weight | Size |
|---|---|---|---|
| Display / Logo | **Inter** | 800 | 32–48px |
| Heading 1 | Inter | 700 | 24px |
| Heading 2 | Inter | 600 | 18px |
| Heading 3 | Inter | 600 | 16px |
| Body | Inter | 400 | 14px |
| Caption / Meta | Inter | 400 | 12px |
| Code / Terminal | **JetBrains Mono** | 400 | 13px |

---

## Component Tokens

### Buttons

```css
/* Primary CTA */
background: var(--color-primary-500);
color: var(--color-text-inverse);
border-radius: 8px;
padding: 10px 20px;
font-weight: 600;

/* Hover */
background: var(--color-primary-400);

/* Ghost */
background: transparent;
border: 1px solid var(--color-border);
color: var(--color-text-primary);
```

### Cards / Panels
```css
background: var(--color-bg-elevated);
border: 1px solid var(--color-border);
border-radius: 12px;
padding: 20px;
```

### Progress Steps (Wizard)
```css
/* Completed step */
icon-color: var(--color-success);
label-color: var(--color-text-primary);

/* Active step */
icon-color: var(--color-primary-500);
label-color: var(--color-text-primary);
font-weight: 600;

/* Pending step */
icon-color: var(--color-text-muted);
label-color: var(--color-text-muted);
```

### Terminal / Log Panel
```css
background: var(--color-bg-deep);
border: 1px solid var(--color-border);
border-radius: 8px;
font-family: 'JetBrains Mono', monospace;
color: #E0E0E0;

/* Active install line */
color: var(--color-primary-400);

/* Success line */
color: var(--color-success);

/* Error line */
color: var(--color-error);
```

---

## Iconography

- **Library:** [Lucide Icons](https://lucide.dev) (consistent, clean, MIT)
- **Size standard:** 16px inline, 20px UI actions, 24px feature icons
- **Active/highlight icons:** colored `var(--color-primary-500)`
- **Neutral icons:** `var(--color-text-secondary)`

---

## Spacing Scale

```
4px  → xs  (tight gaps, icon padding)
8px  → sm  (component internal)
12px → md  (between related elements)
16px → lg  (section padding)
24px → xl  (card padding, major sections)
32px → 2xl (page section gaps)
48px → 3xl (hero / full-section)
```

---

## Border Radius

```
4px  → inputs, tags
8px  → buttons, small cards
12px → cards, panels
16px → modals, large surfaces
full → avatars, status dots, toggle pills
```

---

## Motion

```css
/* Standard transition */
transition: all 150ms ease-in-out;

/* Entrance (fade + slide up) */
animation: fadeSlideUp 200ms ease-out;

/* Install pulse (orange glow on active step) */
animation: orangePulse 1.5s ease-in-out infinite;

@keyframes orangePulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); }
  50%       { box-shadow: 0 0 0 8px rgba(249, 115, 22, 0); }
}
```

---

## Example: Wizard Step Component

```
┌─────────────────────────────────────────────┐
│  ●──────●──────●──────○──────○──────○──────○  │  <- step dots (orange = active)
│  ✓  System  Edition  LLM   Pkgs  Net  Sec  Install
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │  🖥  System Check                        │ │  <- card bg: #1A1A1E
│  │                                         │ │
│  │  ✅  Docker 24.0.7 detected              │ │  <- green
│  │  ✅  WSL2 enabled                        │ │  <- green
│  │  ✅  16GB RAM available                  │ │  <- green
│  │  ⚠️  Disk: 42GB free (40GB recommended)  │ │  <- yellow
│  │                                         │ │
│  │              [ Continue → ]             │ │  <- orange button
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

*Design system maintained by Starfleet Command. All colors subject to contrast accessibility review (WCAG AA minimum).*
