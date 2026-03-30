# M1 Task Brief — OpenTang Bones

Read PRD.md, DESIGN_SYSTEM.md, BUILD_CHECKLIST.md for full context.

## Goal
Scaffold a Tauri v2 + React + TypeScript project for OpenTang — a cross-platform developer environment bootstrapper/installer app.

## Tech Stack
- Tauri v2 (latest)
- React 18 + TypeScript
- Tailwind CSS v3
- Zustand (state management)
- Lucide React (icons)
- Inter font (body), JetBrains Mono (terminal/code)

## Design Tokens (Dark Theme + Orange)
- Primary orange: #F97316 (Tailwind orange-500)
- App background: #0A0A0B
- Primary surface: #111113
- Elevated surface: #1A1A1E
- Border: #2E2E34
- Text primary: #F8F8F8
- Text secondary: #A0A0A8

## Project Structure
Create this layout via `npm create tauri-app` then customize:

```
opentang/
  src/
    components/
      wizard/         # WizardShell.tsx, StepNav.tsx, steps/
      shared/         # Button.tsx, Card.tsx
    store/
      useWizardStore.ts
    App.tsx
    main.tsx
    index.css
  src-tauri/
    src/main.rs
    Cargo.toml
  .github/workflows/build.yml
  LICENSE
  README.md
  CONTRIBUTING.md
  CODE_OF_CONDUCT.md
  package.json
  tailwind.config.js
  tsconfig.json
  vite.config.ts
```

## Welcome Screen (Step 0)
- Full dark background (#0A0A0B), centered layout
- "OpenTang" — Inter 800, white, large
- Tagline: "Your stack. Your rules." — orange (#F97316)
- Subtitle: "The open-source self-hosted AI + developer environment bootstrapper"
- Orange "Begin Setup →" CTA button (rounded-lg, font-semibold)
- Version badge: v0.1.0
- "View Documentation" text link

## Wizard Shell
Left sidebar with vertical step list:
- Steps: Welcome | System Check | Edition | LLM | Packages | Network | Security | Install | Done
- Completed step: green check icon
- Active step: orange text + orange left border highlight
- Pending step: muted gray

Right content area renders current step. Non-welcome steps show placeholder card:
- Step title
- "Coming in the next milestone" subtext

## Zustand Store (useWizardStore.ts)
```ts
interface WizardState {
  currentStep: number;
  completedSteps: number[];
  edition: "nanoclaw" | "hermes" | "openclaw" | null;
  llmMode: "local" | "cloud" | "skip" | null;
  selectedPackages: string[];
  networkMode: "local" | "lan" | "internet" | null;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  completeStep: (step: number) => void;
}
```

## GitHub Actions CI (.github/workflows/build.yml)
- Trigger: push to main + PRs
- Matrix: ubuntu-latest, macos-latest, windows-latest
- Install Node 20 + Rust stable
- Run: npm ci + npm run tauri build
- Upload artifacts per platform

## Required Files With Real Content
- LICENSE — Apache 2.0, copyright Koba42 Corp 2026
- README.md — Project intro, stack, quick start, contributing, license badge
- CONTRIBUTING.md — PR guidelines, code style, how to submit packages to the registry
- CODE_OF_CONDUCT.md — Contributor Covenant 2.1

## CSS Animations (index.css)
Add orange pulse animation for active install steps:
```css
@keyframes orangePulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); }
  50%       { box-shadow: 0 0 0 8px rgba(249, 115, 22, 0); }
}
.animate-orange-pulse { animation: orangePulse 1.5s ease-in-out infinite; }
```

## Tauri Config
- Window title: "OpenTang"
- Minimum size: 1024 x 700
- Default size: 1280 x 800
- decorations: true, resizable: true

## Notes
- Do NOT install xterm.js yet (M3 work)
- Do NOT implement real system detection (M2 work)
- All step content beyond Welcome is placeholder only
- Make it look sharp — this is a professional product

## Completion
When completely finished, run:
openclaw system event --text "M1 Bones complete: OpenTang Tauri scaffold built. Welcome screen and wizard shell ready for Admiral review." --mode now
