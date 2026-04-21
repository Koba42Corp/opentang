# Tactical Template System (Lite) — Manual Verification

## Preconditions
- OpenTang app builds and launches.
- Docker is running.
- You can complete install wizard through Step 8.

---

## Path A: Template profile NOT selected

1. In Step 4 (Package Selection), leave **Tactical Template System (Lite)** unselected.
2. Continue install to completion.
3. Verify template directory does not exist.

```bash
test -d ~/.opentang/templates/tactical-template-system && echo "unexpected: exists" || echo "ok: not installed"
```

Expected:
- `ok: not installed`

---

## Path B: Template profile selected

1. In Step 4, enable **Tactical Template System (Lite)**.
2. Complete install.
3. Verify directory exists:

```bash
test -d ~/.opentang/templates/tactical-template-system && echo ok
```

Expected:
- `ok`

4. Verify expected files:

```bash
find ~/.opentang/templates/tactical-template-system -type f | sort
```

Expected files:
- `~/.opentang/templates/tactical-template-system/README.md`
- `~/.opentang/templates/tactical-template-system/mission-startup.md`
- `~/.opentang/templates/tactical-template-system/role-matrix-lite.md`
- `~/.opentang/templates/tactical-template-system/gates-checklist.md`
- `~/.opentang/templates/tactical-template-system/delegate-prompts-lite.md`
- `~/.opentang/templates/tactical-template-system/missions/feature-ship-lite.md`
- `~/.opentang/templates/tactical-template-system/missions/incident-lite.md`

---

## UI checks

- Step 7 Review shows:
  - `Templates: None` when unselected
  - `Templates: Tactical Template System (Lite)` when selected
- Step 8 Done shows tactical template confirmation card only when selected.
