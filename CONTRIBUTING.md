# Contributing to OpenTang

Thank you for your interest in contributing to OpenTang! This document outlines the guidelines for contributing code, packages, documentation, and bug reports.

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

---

## Ways to Contribute

- **Bug reports** — Open a GitHub Issue with a clear description and reproduction steps
- **Feature requests** — Open a GitHub Issue with a detailed proposal
- **Code contributions** — Open a Pull Request following the guidelines below
- **Package submissions** — Submit a new package to the registry (see below)
- **Documentation** — Improve docs, fix typos, add examples

---

## Development Setup

### Prerequisites

- Node.js 20+
- Rust stable (install via [rustup](https://rustup.rs))
- Linux users: `sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`

### Getting Started

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/opentang.git
cd opentang

# 3. Install dependencies
npm install

# 4. Generate placeholder icons
npm run generate-icons

# 5. Start the dev server
npm run tauri:dev
```

---

## Pull Request Guidelines

### Before Opening a PR

1. Check that your feature or fix doesn't duplicate an existing PR or issue
2. For significant features, open an issue first to discuss the approach
3. Ensure your code passes TypeScript (`npm run lint`) and Rust checks (`cargo check`)

### PR Requirements

- [ ] Title is clear and concise (e.g. `feat: add network mode selector`)
- [ ] Description explains *what* changed and *why*
- [ ] New components follow the design system (see `DESIGN_SYSTEM.md`)
- [ ] Tailwind classes use the `ot-` design token prefix (e.g. `bg-ot-bg`, `text-ot-orange-500`)
- [ ] No hardcoded colors that aren't in the design system
- [ ] Zustand state changes go through `useWizardStore`
- [ ] No new external dependencies without prior discussion

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org):

```
feat: add system check step with Docker detection
fix: sidebar active step border alignment
chore: bump @tauri-apps/cli to 2.2.5
docs: add LLM configuration to README
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `style`

---

## Code Style

### TypeScript / React

- Functional components with TypeScript props interfaces
- No `any` types — use proper types or `unknown`
- Imports: React built-ins first, then external libraries, then internal
- Export: named exports for shared components, default exports for pages/steps
- Component files: `PascalCase.tsx` (e.g. `WizardShell.tsx`)

### Rust

- Follow standard Rust idioms (`rustfmt` auto-formats on save)
- All Tauri commands must have proper `serde` serialization on inputs/outputs
- Add doc comments (`///`) on all public functions

### Design System

- Always use design tokens from `tailwind.config.js` (`ot-*` prefix)
- Dark-first: default state is always dark background, light text
- Orange (`ot-orange-500`) for CTAs, active states, and primary accents only
- Don't use inline `style={}` for colors that have a Tailwind token

---

## Submitting a Package to the Registry

OpenTang has an in-app package registry. Community packages are submitted via PR.

### Package Requirements

1. Create a directory: `packages/<your-package-name>/`
2. Add `compose.yml` — a valid Docker Compose file for your service
3. Add `manifest.json` with this schema:

```json
{
  "id": "your-package",
  "name": "Your Package",
  "version": "1.0.0",
  "description": "One sentence description",
  "category": "automation",
  "compose_url": "https://registry.opentang.koba42.com/packages/your-package/compose.yml",
  "min_ram_mb": 512,
  "featured": false,
  "koba42_featured": false,
  "tags": ["tag1", "tag2"]
}
```

Categories: `ai`, `automation`, `monitoring`, `storage`, `security`, `dev`, `networking`, `other`

4. Add entry to `registry/index.json`
5. Open a PR with the title `package: add <your-package-name>`

### Package Review Criteria

- Service must be open-source or free-tier
- Compose file must use specific image versions (no `latest` tag)
- Must not require outbound internet access for core functionality
- Must include health check configuration

---

## Reporting Security Issues

Please do **not** open a public GitHub issue for security vulnerabilities. See [SECURITY.md](SECURITY.md) for responsible disclosure instructions.

---

## Questions?

Open a [GitHub Discussion](https://github.com/Koba42/opentang/discussions) — we're happy to help.
