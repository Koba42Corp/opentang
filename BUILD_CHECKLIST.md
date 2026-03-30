# OpenTang — Build Checklist
**Version:** 0.1.0  
**Tracking:** Active  
**Last Updated:** 2026-03-30

> Legend: ⬜ Not started | 🔄 In progress | ✅ Done | ❌ Blocked

---

## 🗂 Phase 0 — Repository Setup

- [ ] ⬜ Create GitHub org `Koba42` (or confirm existing)
- [ ] ⬜ Create repo `Koba42/opentang` (public)
- [ ] ⬜ Set repo description and topics (`tauri`, `docker`, `self-hosted`, `ai`, `installer`)
- [ ] ⬜ Add `LICENSE` (Apache 2.0)
- [ ] ⬜ Add `README.md` (project intro, badges, install instructions)
- [ ] ⬜ Add `CONTRIBUTING.md`
- [ ] ⬜ Add `CODE_OF_CONDUCT.md` (Contributor Covenant)
- [ ] ⬜ Add `SECURITY.md` (responsible disclosure policy)
- [ ] ⬜ Add `.github/PULL_REQUEST_TEMPLATE.md`
- [ ] ⬜ Add `.github/ISSUE_TEMPLATE/bug_report.md`
- [ ] ⬜ Add `.github/ISSUE_TEMPLATE/feature_request.md`
- [ ] ⬜ Add `.github/ISSUE_TEMPLATE/package_submission.md`
- [ ] ⬜ Enable GitHub Discussions
- [ ] ⬜ Configure branch protection on `main` (require PR + review)
- [ ] ⬜ Add repo to opentang.koba42.com subdomain

---

## 🏗 Phase 1 — Project Scaffold

- [ ] ⬜ Scaffold Tauri v2 project (`create-tauri-app`)
- [ ] ⬜ Configure React + TypeScript frontend
- [ ] ⬜ Add Tailwind CSS + configure design tokens from DESIGN_SYSTEM.md
- [ ] ⬜ Add Zustand for state management
- [ ] ⬜ Add Lucide Icons
- [ ] ⬜ Add JetBrains Mono + Inter fonts
- [ ] ⬜ Add xterm.js for embedded terminal
- [ ] ⬜ Set up Tauri Updater (GitHub Releases)
- [ ] ⬜ Configure Tauri app icon (orange/dark brand icon)
- [ ] ⬜ Set up app signing (macOS notarization, Windows Authenticode — placeholder for now)
- [ ] ⬜ Configure GitHub Actions: build matrix (Windows, macOS, Linux)
- [ ] ⬜ Configure GitHub Actions: release workflow (tag → build → draft release)
- [ ] ⬜ Add dev scripts to `package.json`
- [ ] ⬜ Verify hot-reload dev environment works on all 3 platforms

---

## 🖥 Phase 2 — System Detection (Rust Backend)

- [ ] ⬜ OS detection module (Windows / macOS / Linux + distro)
- [ ] ⬜ Architecture detection (x86_64 / ARM64)
- [ ] ⬜ RAM available check
- [ ] ⬜ Disk space check (target install path)
- [ ] ⬜ Docker installed + version check
- [ ] ⬜ Docker running check
- [ ] ⬜ WSL2 installed + enabled check (Windows only)
- [ ] ⬜ WSL2 auto-install trigger (Windows, with UAC prompt)
- [ ] ⬜ Docker auto-install trigger (Linux: `apt`/`dnf`; macOS: prompt to install OrbStack/Docker Desktop)
- [ ] ⬜ Expose all checks via Tauri IPC command `system_check`
- [ ] ⬜ Unit tests for system detection module

---

## 🧙 Phase 3 — Install Wizard UI

### Step 0: Welcome
- [ ] ⬜ Splash screen with OpenTang logo + tagline
- [ ] ⬜ Version display
- [ ] ⬜ "Begin Setup" CTA button
- [ ] ⬜ Docs link

### Step 1: System Check
- [ ] ⬜ Animated system scan on mount
- [ ] ⬜ ✅ / ⚠️ / ❌ checklist per requirement
- [ ] ⬜ Auto-fix button for fixable issues (Docker install, WSL2 enable)
- [ ] ⬜ Block progression on ❌ items; allow ⚠️ with warning

### Step 2: Edition Picker
- [ ] ⬜ Three cards: NanoClaw / Hermes / OpenClaw
- [ ] ⬜ Feature comparison table per edition
- [ ] ⬜ Resource estimate per edition (RAM / disk)
- [ ] ⬜ Selected card highlight (orange border glow)

### Step 3: LLM Configuration
- [ ] ⬜ Option A: Install Ollama (local) — model picker (llama3, mistral, phi3, gemma)
- [ ] ⬜ Option B: Cloud API — provider picker (OpenAI, Anthropic, custom) + key input
- [ ] ⬜ Option C: Skip
- [ ] ⬜ API key masked input with show/hide toggle
- [ ] ⬜ Key stored only in local `.env`, never transmitted

### Step 4: Package Selection
- [ ] ⬜ Checkbox grid of Tier 1 packages (default-on)
- [ ] ⬜ Checkbox grid of Tier 2 packages (default-off)
- [ ] ⬜ Description + resource estimate per package (tooltip or expand)
- [ ] ⬜ "Recommended" badge on key packages
- [ ] ⬜ Live resource estimator (total RAM / disk updates as user toggles)
- [ ] ⬜ "Koba42 Featured" badge for curated packages

### Step 5: Network Mode
- [ ] ⬜ Three options: Local / LAN / Internet-facing
- [ ] ⬜ Local: no extra input, localhost only
- [ ] ⬜ LAN: display detected local IP, optional hostname
- [ ] ⬜ Internet: domain input, SSL auto-config note (Traefik + Let's Encrypt)
- [ ] ⬜ Port conflict detection

### Step 6: Security Hardening
- [ ] ⬜ Auto-generate strong passwords for all selected services
- [ ] ⬜ Show generated credentials in masked table (toggle reveal)
- [ ] ⬜ "Copy all credentials" to clipboard
- [ ] ⬜ "Save credentials" to local file (user-chosen path)
- [ ] ⬜ Optional Vault integration toggle

### Step 7: Review & Install
- [ ] ⬜ Full summary of all selections before install begins
- [ ] ⬜ Editable (back buttons per section)
- [ ] ⬜ "Install" CTA (orange, prominent)

### Step 8: Installation Progress
- [ ] ⬜ Step-by-step progress list (one row per service)
- [ ] ⬜ ⏳ → ✅ / ❌ per service
- [ ] ⬜ Orange pulse animation on active install step
- [ ] ⬜ "Show Logs" toggle → xterm.js panel slides in
- [ ] ⬜ Retry button on failed steps
- [ ] ⬜ Cancel with cleanup option
- [ ] ⬜ ETA display

### Step 9: Done
- [ ] ⬜ 🎉 Success screen
- [ ] ⬜ Summary of installed services
- [ ] ⬜ Quick-access URL list per service (click to open in browser)
- [ ] ⬜ "Open Dashboard" button → Coolify
- [ ] ⬜ Community invite (Discord / GitHub link)
- [ ] ⬜ "Add More Packages" → App Store tab

---

## ⚙️ Phase 4 — Docker Compose Engine (Rust)

- [ ] ⬜ Compose template system (per-package YAML templates)
- [ ] ⬜ Dynamic compose file generator based on user selections
- [ ] ⬜ Environment variable injection (passwords, domain, keys)
- [ ] ⬜ Network configuration (bridge / host based on mode)
- [ ] ⬜ Volume path resolution per OS
- [ ] ⬜ `docker compose up -d` execution with streaming output
- [ ] ⬜ Per-service health check polling (container running check)
- [ ] ⬜ Rollback / cleanup on failure
- [ ] ⬜ Write final `.env` + `docker-compose.yml` to user-defined install path

### Compose Templates — Tier 1
- [ ] ⬜ `packages/coolify/compose.yml`
- [ ] ⬜ `packages/openclaw/compose.yml`
- [ ] ⬜ `packages/hermes/compose.yml`
- [ ] ⬜ `packages/nanoclaw/compose.yml`
- [ ] ⬜ `packages/ollama/compose.yml`
- [ ] ⬜ `packages/gitea/compose.yml`
- [ ] ⬜ `packages/portainer/compose.yml`
- [ ] ⬜ `packages/grafana/compose.yml`
- [ ] ⬜ `packages/prometheus/compose.yml`

### Compose Templates — Tier 2
- [ ] ⬜ `packages/n8n/compose.yml`
- [ ] ⬜ `packages/vault/compose.yml`
- [ ] ⬜ `packages/uptime-kuma/compose.yml`
- [ ] ⬜ `packages/vaultwarden/compose.yml`
- [ ] ⬜ `packages/nextcloud/compose.yml`
- [ ] ⬜ `packages/searxng/compose.yml`

---

## 📦 Phase 5 — Package Registry

- [ ] ⬜ Define registry manifest schema (JSON)
- [ ] ⬜ Build local `registry/index.json` with all Tier 1 + 2 packages
- [ ] ⬜ Host registry at `https://registry.opentang.koba42.com/index.json`
- [ ] ⬜ Rust registry fetch + cache module
- [ ] ⬜ Registry version check (update notification if registry newer than cached)

---

## 🏪 Phase 6 — In-App Store UI (v0.2.0)

- [ ] ⬜ App Store tab in main nav (post-install)
- [ ] ⬜ Browse packages by category
- [ ] ⬜ Install / uninstall / update per package
- [ ] ⬜ Service health dashboard (container status per installed service)
- [ ] ⬜ One-click restart / stop / logs per service
- [ ] ⬜ ClawHub integration (skills + plugins for OpenClaw)
- [ ] ⬜ Koba42 Featured section
- [ ] ⬜ Community packages section

---

## 🔄 Phase 7 — Auto-Update

- [ ] ⬜ Tauri Updater configured for GitHub Releases
- [ ] ⬜ Update check on app launch (silent)
- [ ] ⬜ Notification banner if update available
- [ ] ⬜ Changelog display in update prompt
- [ ] ⬜ Background download + install on next launch

---

## 🎨 Phase 8 — Polish & QA

- [ ] ⬜ Full design system applied (all tokens from DESIGN_SYSTEM.md)
- [ ] ⬜ Orange pulse animations on install steps
- [ ] ⬜ Smooth step transitions (fade + slide)
- [ ] ⬜ Responsive layout (min 1024px window)
- [ ] ⬜ Accessibility pass (WCAG AA contrast minimum)
- [ ] ⬜ Windows E2E test (WSL2 + Docker install flow)
- [ ] ⬜ macOS E2E test (Docker Desktop + full stack)
- [ ] ⬜ Linux E2E test (Ubuntu 22.04 + native Docker)
- [ ] ⬜ Error handling: all install failure states handled gracefully
- [ ] ⬜ Offline detection + helpful error messaging

---

## 🚀 Phase 9 — Launch Prep

- [ ] ⬜ Landing page at opentang.koba42.com
- [ ] ⬜ Download links per platform on landing page
- [ ] ⬜ Docs site (GitHub Pages or Koba42 subdomain)
- [ ] ⬜ GitHub release v0.1.0 with signed binaries
- [ ] ⬜ Community announcement (Discord, X.com, Reddit)
- [ ] ⬜ Demo video / GIF for README

---

## 📊 Progress Tracker

| Phase | Status | Notes |
|---|---|---|
| 0 — Repo Setup | ⬜ Not started | |
| 1 — Scaffold | ⬜ Not started | |
| 2 — System Detection | ⬜ Not started | |
| 3 — Wizard UI | ⬜ Not started | |
| 4 — Compose Engine | ⬜ Not started | |
| 5 — Registry | ⬜ Not started | |
| 6 — App Store | ⬜ Not started | v0.2.0 |
| 7 — Auto-Update | ⬜ Not started | |
| 8 — Polish & QA | ⬜ Not started | |
| 9 — Launch | ⬜ Not started | |

---

*Checklist maintained by Starfleet Command. Update phase statuses and check boxes as work progresses.*
