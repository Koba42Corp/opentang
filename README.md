# opentang-landing

Landing page source for [opentang.koba42.com](https://opentang.koba42.com).

A single-file static site — no build step, no framework, no dependencies beyond Tailwind CDN.

## Files

| File | Purpose |
|------|---------|
| `index.html` | The entire landing page (HTML + Tailwind + vanilla JS) |
| `CNAME` | GitHub Pages custom domain config |

## Deploying

Push to any static host. For GitHub Pages:

1. Create a repo (or push this directory to one)
2. Go to **Settings → Pages** → set source to the branch/root
3. The `CNAME` file handles the custom domain automatically

## Tech

- **Tailwind CSS** via CDN (no build step)
- **Inter** + **JetBrains Mono** via Google Fonts
- Vanilla JS for mobile nav toggle and scroll animations

## Related

- App repo: [github.com/Koba42Corp/opentang](https://github.com/Koba42Corp/opentang)
- Company: [koba42.com](https://koba42.com)
