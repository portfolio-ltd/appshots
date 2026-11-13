# AppShots

**Store-ready App Store and Google Play screenshots, made in your browser.**

Drop in raw simulator screenshots, pick a look, and download a ZIP of polished marketing screenshots: device frames, headlines, gradients and stickers, at the exact resolutions each store accepts. No account, no upload, no server. Your screenshots never leave your machine.

**[Try it at appshots.portfolio.ltd →](https://appshots.portfolio.ltd)**

[![CI](https://github.com/portfolio-ltd/appshots/actions/workflows/ci.yml/badge.svg)](https://github.com/portfolio-ltd/appshots/actions/workflows/ci.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)

![Screenshots made with AppShots from real captures of Notchday and LocalSpend: Night Glow, Soft Daylight and Violet & Lilac templates, plus a Google Play feature graphic](docs/showcase.png)

No screenshots of your own yet? Click **Try with sample screenshots** on the home page to open a finished sample project.

## Features

- **Exact store sizes.** Every export matches an accepted resolution: iPhone 6.9″/6.5″/6.3″/6.1″, iPhone Duo (inner and outer displays), iPad 13″/11″/9.7″, Apple Watch, and Play phone, 7″/10″ tablet, Chromebook, Wear OS, Android TV, Android Automotive and Android XR, plus the **Play feature graphic** (1024×500), which reuses your first phone screenshot unless you add one. Store count limits are checked before export, each device shows the current store rule (required, optional, scaled or deadline), and files over Google Play's size limits are re-encoded as JPEG automatically.
- **What you see is what you export.** The editor preview and the export use the same canvas renderer, so they cannot drift apart.
- **Real device frames.** iPhone with Dynamic Island, an unfolded iPhone Duo, Android phones with a punch-hole camera, iPad, Android tablets, a Chromebook-style laptop and Apple Watch, all drawn in code. You can also use a floating card or a full-bleed layout.
- **Typography that holds up.** Five bundled open-source fonts with auto-fit and balanced line wrapping, colour emoji, and multi-line headlines (press Enter for "Tap once.↵Keep the chain.").
- **Lighting and layout.** Gradients with a soft glow behind the caption or the device, and a "fill" mode where the device spans the canvas and runs off the edge.
- **Templates that work as a set.** One-click looks applied to every screenshot at once. Some templates give each screenshot its own colour while sharing one base, and step numbers are optional.
- **Captions for the whole set.** Built-in suggestions need no setup. With your own Anthropic API key, Claude looks at each screenshot, plus any README or notes you paste, and writes a caption for what that screen shows. Your key and downscaled copies of your screenshots go straight from your browser to `api.anthropic.com` and nowhere else.
- **Drafts survive reloads.** Settings live in `localStorage` and screenshots in IndexedDB, on your device only.

![The design editor](docs/editor.png)

## Quick start

The quickest way is to use the hosted version at **[appshots.portfolio.ltd](https://appshots.portfolio.ltd)**. It's the same code as this repo, and everything still runs in your browser.

To run it locally (requires Node.js 20+):

```bash
git clone https://github.com/portfolio-ltd/appshots.git
cd appshots
npm install
npm run dev
```

Open <http://localhost:3000>. No environment variables or accounts are needed.

## How it works

1. **App info.** Name, description and category, plus the stores and devices you're targeting.
2. **Upload.** Add raw screenshots per device (PNG, JPEG or WebP, any resolution). The order you add them is the order they're exported in.
3. **Design.** Each screenshot has its own design. Use templates, "Apply this style to all" or story mode to keep the set consistent.
4. **Export.** Review every output against the store checklist, then download one ZIP:

```
app-store/iphone-6.3/01.png        1206×2622
app-store/iphone-duo-inner/01.png  2007×2853
app-store/ipad-13/01.png           2064×2752
play-store/phone/01.png            1080×1920
play-store/chromebook/01.png       1920×1080
play-store/xr/01.png               3840×2400
…
```

## Deploying

AppShots is a fully static site (`output: "export"`). `npm run build` writes everything to `out/`, which you can host anywhere:

- **Vercel / Netlify / Cloudflare Pages:** import the repo. The defaults work.
- **GitHub Pages or any sub-path:** build with `NEXT_PUBLIC_BASE_PATH=/your-repo npm run build`.

## Project layout

```
app/                 Pages: landing, onboarding, upload, customise (editor), export
components/          DesignCanvas (live preview), controls, shadcn/ui primitives
lib/render/          The renderer — pure layout + geometry, and canvas drawing
lib/constants.ts     Device specs (output sizes, frames, store limits), templates
lib/export.ts        Full-resolution render, size-limit handling, ZIP
lib/autodesign.ts    Caption generation (local heuristic + Claude BYOK, which sees the screens)
lib/demo.ts          The sample project (real Notchday captures in public/examples/)
lib/shots.ts         Borrowed screenshots (the feature graphic reuses a phone shot)
lib/persist.ts       Draft storage (localStorage)
lib/files.ts         Screenshot storage (IndexedDB)
tests/               Vitest unit tests for layout, wrapping and specs
```

The renderer is split so the hard parts are testable without a browser. `lib/render/layout.ts` and `lib/render/geometry.ts` are pure functions that take a `measure` callback. `lib/render/draw.ts` is the only code that touches a canvas.

## Development

| Task | Command |
|---|---|
| Dev server | `npm run dev` |
| Unit tests | `npm test` |
| Type check | `npm run typecheck` |
| Lint | `npm run lint` |
| Production build | `npm run build` |

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to add a device or template, and for the pull request checklist.

## Store requirements

Output sizes follow Apple's [screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications) and Google Play's [preview asset guidelines](https://support.google.com/googleplay/android-developer/answer/9866151). Stores change these occasionally. If you spot a mismatch, please [open an issue](https://github.com/portfolio-ltd/appshots/issues).

AppShots is not affiliated with Apple or Google. Device frames are generic illustrations drawn in code.

## License

[GNU AGPL-3.0](LICENSE) © Sagar Chand Agarwal and contributors. You're free to use, modify and self-host AppShots. If you run a modified version as a public service, you must publish your changes under the same license.
