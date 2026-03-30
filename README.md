# OpenTang

**Your stack. Your rules.**

OpenTang is a cross-platform, open-source developer environment bootstrapper. It gives technically-minded users a dead-simple, elegant, and secure way to install a complete self-hosted AI + developer infrastructure stack — on their local machine, home server, or VPS — in minutes, not days.

Think: **Homebrew meets Docker Desktop meets an AI-native App Store.**

---

## What It Does

OpenTang walks you through a guided wizard that:

1. Checks your system (Docker, WSL2, RAM, disk)
2. Lets you choose an edition (NanoClaw / Hermes / OpenClaw)
3. Configures your LLM (local Ollama or cloud API key)
4. Selects packages (Gitea, Portainer, Grafana, n8n, and more)
5. Sets up networking (localhost, LAN, or internet-facing with auto-SSL)
6. Hardens security (auto-generated credentials, local `.env`)
7. Installs and launches your entire stack

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop framework | Tauri v2 (Rust + WebView) |
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS v3 |
| State | Zustand |
| Icons | Lucide React |
| Fonts | Inter + JetBrains Mono |
| Backend | Rust (Tauri IPC) |
| Runtime | Docker Compose v2 |

---

## Platform Support

| Platform | Method |
|---|---|
| **Windows** | WSL2 + Docker Engine (no Docker Desktop required) |
| **macOS** | Docker Desktop or OrbStack |
| **Linux** | Docker Engine (native) |

---

## Quick Start

### Prerequisites

- [Node.js 20+](https://nodejs.org)
- [Rust stable](https://rustup.rs)
- Linux: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`

### Development

```bash
# Clone
git clone https://github.com/Koba42/opentang.git
cd opentang

# Install dependencies
npm install

# Generate placeholder icons
npm run generate-icons

# Start development server with hot-reload
npm run tauri:dev
```

### Production Build

```bash
npm run tauri:build
```

Binaries are placed in `src-tauri/target/release/bundle/`.

---

## Project Structure

```
opentang/
├── src/                        # React frontend
│   ├── components/
│   │   ├── wizard/             # WizardShell, StepNav, step components
│   │   └── shared/             # Button, Card
│   ├── store/                  # Zustand state (useWizardStore.ts)
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css               # Tailwind + CSS custom properties
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   └── lib.rs
│   ├── capabilities/
│   │   └── default.json
│   ├── icons/                  # App icons (generated via scripts/generate-icons.js)
│   ├── Cargo.toml
│   └── tauri.conf.json
├── scripts/
│   └── generate-icons.js       # Placeholder icon generator
├── .github/
│   └── workflows/
│       └── build.yml           # CI: build matrix (Windows, macOS, Linux)
├── LICENSE                     # Apache 2.0
├── CONTRIBUTING.md
└── CODE_OF_CONDUCT.md
```

---

## Design System

OpenTang uses a dark-first design with an orange primary color:

| Token | Value | Usage |
|---|---|---|
| Primary orange | `#F97316` | CTAs, active states, highlights |
| App background | `#0A0A0B` | Main window background |
| Surface | `#111113` | Sidebar, panels |
| Elevated | `#1A1A1E` | Cards, dropdowns |
| Border | `#2E2E34` | Dividers, card outlines |
| Text primary | `#F8F8F8` | Headlines, labels |
| Text secondary | `#A0A0A8` | Descriptions, meta |

---

## Milestones

| Milestone | Status | Scope |
|---|---|---|
| **M1 — Bones** | In progress | Tauri scaffold, design system, welcome screen, wizard shell |
| M2 — Brain | Planned | System detection, edition picker, LLM config, package selection |
| M3 — Engine | Planned | Docker Compose generation, install engine, xterm.js logs |
| M4 — Polish | Planned | Full QA, auto-updater, signed binaries, App Store |

---

## Contributing

We welcome contributions from the community. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

All contributors are expected to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## License

Apache 2.0 — Copyright 2026 Koba42 Corp.

See [LICENSE](LICENSE) for the full text.

---

## Links

- Website: [opentang.koba42.com](https://opentang.koba42.com)
- Issues: [GitHub Issues](https://github.com/Koba42/opentang/issues)
- Discussions: [GitHub Discussions](https://github.com/Koba42/opentang/discussions)
- Built by: [Koba42 Corp](https://koba42.com)
