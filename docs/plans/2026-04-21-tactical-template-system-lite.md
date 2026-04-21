# Tactical Template System (Lite) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an optional installer profile (“Tactical Template System (Lite)”) that writes a lightweight Starfleet/Hermes doctrine template bundle into the OpenTang install directory.

**Architecture:** Extend wizard state + install payload with a `template_profile` field, add an opt-in UI card in the package-selection step, then have the Tauri installer write bundled markdown templates to `<install_path>/templates/tactical-template-system/` during `generate_compose`. Keep behavior fully optional and backward-compatible.

**Tech Stack:** React + Zustand + TypeScript frontend, Tauri v2 + Rust backend, filesystem writes via Rust stdlib.

---

## Scope and constraints

- No changes to runtime containers in this phase.
- No forced install; feature is opt-in.
- Existing installs must behave exactly the same when template is not selected.
- Template files are static repo assets copied/written at install time.

---

### Task 1: Add frontend state and payload type for template profile

**Files:**
- Modify: `src/store/useWizardStore.ts`
- Modify: `src/types/install.ts`
- Modify: `src/components/wizard/steps/Step7Install.tsx`

**Step 1: Add state field + setter in wizard store**

In `src/store/useWizardStore.ts`:
- Add union type field in `WizardState`:
  - `templateProfile: "none" | "tactical-lite";`
- Add setter:
  - `setTemplateProfile: (profile: WizardState["templateProfile"]) => void;`
- Initialize default state to `"none"`.
- Add action implementation in store body.

**Step 2: Extend shared install payload type**

In `src/types/install.ts` add optional field to `InstallConfig`:

```ts
template_profile?: "none" | "tactical-lite";
```

**Step 3: Include `template_profile` in invoke payload**

In `src/components/wizard/steps/Step7Install.tsx`, inside `invoke("generate_compose", { config: { ... } })`, add:

```ts
template_profile: templateProfile,
```

(using state value from store).

**Step 4: Type check frontend**

Run: `npm run lint`
Expected: no TypeScript errors.

**Step 5: Commit**

```bash
git add src/store/useWizardStore.ts src/types/install.ts src/components/wizard/steps/Step7Install.tsx
git commit -m "feat(installer): add template profile to wizard state and install payload"
```

---

### Task 2: Add installer UI toggle for Tactical Template System (Lite)

**Files:**
- Modify: `src/components/wizard/steps/Step4Packages.tsx`

**Step 1: Add profile card block**

In Step 4, add a dedicated section below core/optional package lists:
- Title: `Templates`
- Card/toggle: `Tactical Template System (Lite)`
- Description: short, clear value proposition.

**Step 2: Wire selection behavior**

Use store state/actions:
- selected: `templateProfile === "tactical-lite"`
- toggle to `"tactical-lite"` / `"none"`

**Step 3: Add concise explanatory copy**

Include bullets such as:
- 4-layer command hierarchy
- 5 non-skippable gates
- role contracts + delegate prompt templates

**Step 4: Verify in UI**

Run: `npm run dev`
Manual check:
- Toggle card on/off
- Selection persists when moving Step 4 -> Step 5 -> back to Step 4.

**Step 5: Commit**

```bash
git add src/components/wizard/steps/Step4Packages.tsx
git commit -m "feat(wizard): add Tactical Template System Lite opt-in card"
```

---

### Task 3: Surface selection in review step (pre-install confidence)

**Files:**
- Modify: `src/components/wizard/steps/Step7Install.tsx`

**Step 1: Add summary row**

In `summaryRows`, append:
- label: `Templates`
- value: `Tactical Template System (Lite)` when selected, else `None`
- step: 4 (edit path)

**Step 2: Include in install/skip summary text**

Add one small line in pre-install view stating whether template bundle will be written.

**Step 3: Smoke check**

Run: `npm run dev`
Manual check:
- Review screen accurately reflects selection.

**Step 4: Commit**

```bash
git add src/components/wizard/steps/Step7Install.tsx
git commit -m "feat(wizard): show template profile selection in review step"
```

---

### Task 4: Add backend InstallConfig support for template profile

**Files:**
- Modify: `src-tauri/src/commands/install.rs`

**Step 1: Extend Rust `InstallConfig` struct**

Add field with serde default:

```rust
#[serde(default)]
pub template_profile: Option<String>,
```

**Step 2: Add helper predicate**

Create helper function near other helpers:

```rust
fn wants_tactical_lite(config: &InstallConfig) -> bool {
    matches!(config.template_profile.as_deref(), Some("tactical-lite"))
}
```

**Step 3: Compile check**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: successful compile.

**Step 4: Commit**

```bash
git add src-tauri/src/commands/install.rs
git commit -m "feat(installer): add template_profile to backend install config"
```

---

### Task 5: Create tactical-lite template bundle writer in Rust

**Files:**
- Modify: `src-tauri/src/commands/install.rs`

**Step 1: Add content constants**

Add static `&str` constants for each bundled file:
- `README.md`
- `mission-startup.md`
- `role-matrix-lite.md`
- `gates-checklist.md`
- `delegate-prompts-lite.md`
- `missions/feature-ship-lite.md`
- `missions/incident-lite.md`

Keep each document short and production-useful.

**Step 2: Add write function**

Implement:

```rust
fn write_tactical_template_bundle(install_path: &std::path::Path) -> Result<(), String>
```

Behavior:
- create `<install_path>/templates/tactical-template-system/missions`
- write each file
- return readable error messages if write fails

**Step 3: Call writer in `generate_compose`**

After `.env` write and before return:
- `if wants_tactical_lite(&config) { write_tactical_template_bundle(&path)?; }`

**Step 4: Keep safe idempotence**

Overwriting template files is acceptable for deterministic updates in this phase.

**Step 5: Compile check**

Run: `cargo check --manifest-path src-tauri/Cargo.toml`
Expected: successful compile.

**Step 6: Commit**

```bash
git add src-tauri/src/commands/install.rs
git commit -m "feat(installer): write tactical template bundle into install path"
```

---

### Task 6: Add post-install confirmation messaging

**Files:**
- Modify: `src/components/wizard/steps/Step8Done.tsx`

**Step 1: Add conditional success notice**

When `templateProfile === "tactical-lite"`, show:
- “Tactical Template System (Lite) installed”
- target path: `<installPath>/templates/tactical-template-system`

**Step 2: Add quick action**

Add button/link action:
- “Open Templates Folder” (if opener wiring already exists in component, reuse; otherwise keep as copyable path text in this phase)

**Step 3: Manual validation**

Run: `npm run dev`
Manual check:
- Notice appears only when selected.

**Step 4: Commit**

```bash
git add src/components/wizard/steps/Step8Done.tsx
git commit -m "feat(done): confirm tactical template installation in completion step"
```

---

### Task 7: Add lightweight installer integration test checklist (manual)

**Files:**
- Create: `docs/testing/tactical-template-system-lite-manual.md`

**Step 1: Write checklist with two test paths**

Path A (unselected):
- run install
- verify no `templates/tactical-template-system` directory created

Path B (selected):
- run install
- verify directory + all expected files exist

**Step 2: Include exact filesystem checks**

Use commands:

```bash
test -d ~/.opentang/templates/tactical-template-system && echo ok
find ~/.opentang/templates/tactical-template-system -type f | sort
```

**Step 3: Commit**

```bash
git add docs/testing/tactical-template-system-lite-manual.md
git commit -m "docs(test): add manual verification checklist for tactical template install"
```

---

### Task 8: Final verification and release readiness

**Files:**
- Verify changed files from Tasks 1–7

**Step 1: Frontend type/build verification**

Run:

```bash
npm run lint
npm run build
```

Expected:
- no TypeScript errors
- Vite build completes

**Step 2: Backend verification**

Run:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

Expected:
- no Rust compile errors

**Step 3: End-to-end smoke in Tauri dev**

Run:

```bash
npm run tauri:dev
```

Manual checks:
- toggle appears in Step 4
- selection shows in Step 7
- install with selection writes bundle
- Step 8 confirmation appears

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(installer): add Tactical Template System Lite optional profile"
```

---

## Template content guidelines (Lite bundle)

Keep docs practical and short. Avoid org-specific secrets or infrastructure references.

- `README.md`: what this is, where to start, 5-minute quickstart
- `mission-startup.md`: mission kickoff checklist (objective, constraints, done criteria)
- `role-matrix-lite.md`: command authority, orchestrator, core divisions
- `gates-checklist.md`: Gate 0–4 with evidence requirements
- `delegate-prompts-lite.md`: prompt scaffolds for Eng/QA/Legal/Marketing leads
- `missions/feature-ship-lite.md`: feature mission starter
- `missions/incident-lite.md`: incident triage starter

---

## Risks and mitigations

- **Risk:** UI clutter in Step 4  
  **Mitigation:** keep template profile in its own compact card section.

- **Risk:** path write failures on restricted directories  
  **Mitigation:** return explicit install error with destination path and OS message.

- **Risk:** future runtime shift from placeholder edition image  
  **Mitigation:** keep template install independent from container implementation.

---

## Definition of done

- Optional profile appears in installer and can be selected/deselected.
- `template_profile` round-trips frontend -> backend.
- Selecting profile writes Lite bundle under install path.
- Not selecting profile performs no template writes.
- Build and compile checks pass.
- Manual test checklist added.
