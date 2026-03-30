# OpenTang — Product Requirements Document
**Version:** 0.1.0-draft  
**Author:** Admiral Nakamura / Starfleet Command  
**Owner:** Admiral Dracattus / Koba42 Corp  
**License:** Apache 2.0  
**Distribution:** opentang.koba42.com  
**Repo:** github.com/Koba42/opentang (public, community-maintained)

---

## 1. Vision

OpenTang is a cross-platform, open-source developer environment bootstrapper. It gives technically-minded users a dead-simple, elegant, and secure way to install a complete self-hosted AI + developer infrastructure stack — on their local machine, home server, or VPS — in minutes, not days.

Think: **Homebrew meets Docker Desktop meets an AI-native App Store.**

It is elegant. It is professional. It is the on-ramp to the self-hosted AI era.

---

## 2. Product Goals

| Goal | Description |
|---|---|
| **Simplicity** | Non-experts can complete a full install in under 10 minutes |
| **Security** | Every default is hardened. SSL, secrets management, and least-privilege out of the box |
| **Extensibility** | An in-app package registry allows users to install new tools post-setup |
| **Cross-platform** | Windows (WSL2), macOS, and Linux — identical UX across all three |
| **Community-driven** | Apache 2.0, open PRs, public maintainers, ClawHub integration |
| **Koba42-powered** | Featured packages, future premium tiers, and ecosystem monetization hooks |

---

## 3. Target Users

**Primary (v0.1.0)**
- Developers and technical enthusiasts setting up a personal AI/dev stack
- Friends of Admiral Dracattus / Koba42 community members
- Self-hosters who know Docker but dread YAML sprawl

**Secondary (v1.0+)**
- Small dev teams bootstrapping shared infrastructure
- AI tinkerers wanting a local LLM setup with zero friction
- Indie hackers wanting a full self-hosted SaaS-in-a-box

---

## 4. Platform Support

| Platform | Method | Notes |
|---|---|---|
| **Windows** | WSL2 + Docker Engine | OpenTang installs WSL2 if missing; no Docker Desktop dependency |
| **macOS** | Docker Desktop or OrbStack | User prompted to choose; M1/M2/M3 native ARM support |
| **Linux** | Docker Engine (native) | Debian/Ubuntu/Fedora/Arch targets |

---

## 5. Technical Stack

### 5.1 Frontend (Installer App)
| Component | Choice | Rationale |
|---|---|---|
| Framework | **Tauri v2** (Rust + WebView) | Lightweight, native, no Chromium bundle, cross-platform |
| UI Layer | **React + TypeScript** | Familiar, componentized, excellent ecosystem |
| Styling | **Tailwind CSS** | Utility-first, consistent, fast to build |
| Terminal Emulator | **xterm.js** (embedded) | Real terminal feel inside the app |
| State Management | **Zustand** | Lightweight, simple, no boilerplate |

### 5.2 Backend / Orchestration
| Component | Choice | Rationale |
|---|---|---|
| Compose runtime | **Docker Compose v2** | Industry standard, declarative, extensible |
| Config generation | **Rust (Tauri backend)** | Generates compose files dynamically based on user selections |
| Package registry | **JSON manifest over HTTPS** | Served from opentang.koba42.com, versioned |
| Auto-update | **Tauri Updater** | GitHub Releases as update source |
| Secrets bootstrap | **Rust-generated .env** | Prompts user for API keys; stored locally, never transmitted |

### 5.3 Infrastructure Stack (What Gets Installed)

#### Core (always installed)
| Service | Purpose |
|---|---|
| Docker / WSL2 | Container runtime |
| Traefik | Reverse proxy + automatic SSL (via Coolify) |
| Coolify | Self-hosted PaaS — manages all container deployments |

#### Tier 1 — Recommended (default-on, can opt out)
| Service | Purpose |
|---|---|
| OpenClaw / Hermes / NanoClaw | AI agent system (user picks edition) |
| Ollama | Local LLM runtime (optional — or bring your own API key) |
| Gitea | Private Git server |
| Portainer | Docker management UI |
| Grafana + Prometheus | Monitoring and observability |

#### Tier 2 — Optional (user selects in App Store)
| Service | Purpose |
|---|---|
| n8n | Workflow automation |
| Vault (HashiCorp) | Secrets management |
| Uptime Kuma | Uptime monitoring |
| Vaultwarden | Self-hosted Bitwarden |
| Nextcloud | Self-hosted cloud storage |
| SearXNG | Private search engine |
| Memos | Self-hosted notes |
| *(extensible via registry)* | Community-submitted packages |

---

## 6. User Experience — Install Flow

### Step 1: Welcome Screen
- OpenTang logo, version, tagline
- "Begin Setup" CTA
- Link to docs

### Step 2: System Check
- Auto-detect OS, architecture, RAM, disk
- Check Docker / WSL2 status
- Visual checklist: ✅ / ⚠️ / ❌ per requirement
- Auto-fix prompt for missing dependencies

### Step 3: Choose Your Edition
- **NanoClaw** — Minimal, local, lightweight
- **Hermes** — Mid-tier, balanced
- **OpenClaw** — Full stack, all features
- Comparison table shown inline

### Step 4: LLM Configuration
- Option A: **Local LLM** — Install Ollama, pick model (llama3, mistral, etc.)
- Option B: **Cloud API** — Enter OpenAI / Anthropic / custom key
- Option C: **Skip for now**

### Step 5: Package Selection
- Checkbox grid of Tier 1 + Tier 2 packages
- Each has a description, resource estimate, and "recommended" badge
- Live resource estimator updates total RAM/disk as they toggle

### Step 6: Network Setup
- **Local only** (localhost) — no domain needed
- **LAN / Home server** — shows local IP, sets up mDNS
- **Internet-facing** — domain entry, auto SSL via Traefik + Let's Encrypt

### Step 7: Security Hardening
- Auto-generate strong passwords for all services
- Secrets stored in local `.env` (never transmitted)
- Optional: integrate with Vault for long-term secret management
- SSH key generation prompt (for VPS targets)

### Step 8: Installation
- Step-by-step progress wizard (not raw logs by default)
- Each service: ⏳ → ✅ / ❌ with retry option
- "Show Logs" toggle reveals xterm.js terminal output
- Estimated time remaining

### Step 9: Done 🎉
- Summary of what was installed
- Quick-access URLs for each service
- "Open Dashboard" button (launches Coolify)
- Invite to join community / ClawHub

---

## 7. In-App Package Registry ("App Store")

Post-install, the OpenTang app persists as a management layer.

### Features
- Browse available packages (official + community)
- Install / uninstall / update individual services
- View service health (Docker container status)
- One-click restart / stop / logs per service
- ClawHub integration for OpenClaw skills and plugins

### Registry Format
Packages defined as versioned JSON manifests:
```json
{
  "id": "n8n",
  "name": "n8n",
  "version": "1.0.0",
  "description": "Workflow automation",
  "category": "automation",
  "compose_url": "https://registry.opentang.koba42.com/packages/n8n/compose.yml",
  "min_ram_mb": 512,
  "featured": false,
  "koba42_featured": false,
  "tags": ["automation", "workflows", "nocode"]
}
```

---

## 8. Auto-Update System

- Tauri Updater checks GitHub Releases on app launch
- Silent background download, prompt to install on next launch
- Package manifests versioned independently (registry updates don't require app update)
- Semantic versioning: `MAJOR.MINOR.PATCH`

---

## 9. Monetization Hooks (Koba42)

| Hook | Description |
|---|---|
| **Featured packages** | Koba42-curated packages surface at top of App Store |
| **Premium registry tier** | Enterprise packages, private manifests (future) |
| **Managed hosting upsell** | "Deploy to cloud" button → Koba42 managed VPS offering |
| **OpenClaw Pro** | Premium OpenClaw features unlocked via license key |
| **Support tiers** | Community (free) vs. Koba42 Priority Support (paid) |

---

## 10. Repo Structure

```
opentang/
├── .github/
│   ├── workflows/          # CI/CD: build, release, test
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
├── src/
│   ├── app/                # React frontend
│   │   ├── components/
│   │   │   ├── wizard/     # Install wizard steps
│   │   │   ├── store/      # App Store UI
│   │   │   ├── dashboard/  # Post-install management
│   │   │   └── shared/     # Buttons, modals, etc.
│   │   ├── pages/
│   │   ├── store/          # Zustand state
│   │   └── main.tsx
│   └── tauri/              # Rust backend
│       ├── src/
│       │   ├── commands/   # Tauri commands (IPC)
│       │   ├── compose/    # Docker Compose generation
│       │   ├── system/     # OS detection, prereq checks
│       │   ├── registry/   # Package manifest fetching
│       │   └── main.rs
│       └── Cargo.toml
├── packages/               # Default compose templates
│   ├── openclaw/
│   ├── ollama/
│   ├── gitea/
│   ├── grafana/
│   └── ...
├── registry/               # Local registry manifest (mirrors remote)
│   └── index.json
├── docs/                   # Documentation
│   ├── getting-started.md
│   ├── contributing.md
│   └── package-authoring.md
├── scripts/                # Dev/build helpers
├── LICENSE                 # Apache 2.0
├── README.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
└── tauri.conf.json
```

---

## 11. MVP Scope — v0.1.0

**Ships when:**
- [ ] Tauri app builds for Windows (WSL2), macOS, Linux
- [ ] System check (Docker, WSL2, RAM, disk)
- [ ] Edition picker (NanoClaw / Hermes / OpenClaw)
- [ ] LLM config (Ollama or API key)
- [ ] Tier 1 package selection with resource estimator
- [ ] Network mode selection (local / LAN / internet)
- [ ] Automated Docker Compose generation + launch
- [ ] Step-by-step progress wizard with log toggle
- [ ] Done screen with service URLs
- [ ] Auto-update wired to GitHub Releases
- [ ] README, CONTRIBUTING, LICENSE, CODE_OF_CONDUCT

**Deferred to v0.2.0:**
- In-app App Store / package registry
- ClawHub integration
- Koba42 monetization hooks
- Vault integration
- Full n8n / Vaultwarden / Nextcloud packages

---

## 12. Community & Governance

- **License:** Apache 2.0
- **Repo:** github.com/Koba42/opentang
- **Maintainers:** Admiral Dracattus + appointed community maintainers
- **Contributions:** PRs welcome; CONTRIBUTING.md defines standards
- **Code of Conduct:** Contributor Covenant
- **Package submissions:** Via PR to `registry/` directory
- **Discussions:** GitHub Discussions enabled
- **Releases:** Tagged via GitHub Actions on merge to `main`

---

## 13. Open Questions (resolve before build)

1. Does OpenTang manage Docker itself or assume Docker is pre-installed?
   - **Recommendation:** Auto-install Docker/WSL2 if missing (requires elevated permissions prompt)
2. Will the Tauri app run persistently as a background service, or only open on-demand?
   - **Recommendation:** System tray icon, runs as background service for health monitoring
3. First-party package hosting — does Koba42 need a CDN for compose files?
   - **Recommendation:** GitHub-hosted initially, move to CDN at scale

---

*Document maintained by Starfleet Command. Last updated: 2026-03-30.*
