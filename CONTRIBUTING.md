# Contributing to AppShots

Thanks for helping. Bug reports, store-spec corrections, new device frames, templates and docs fixes are all welcome.

## Getting set up

```bash
npm install
npm run dev     # http://localhost:3000
```

There is no backend and no environment configuration. Everything runs in the browser.

## Before opening a pull request

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

CI runs the same commands. For anything that changes rendering, also check the result by eye. Run through the flow with a real screenshot and include before/after images in the PR. The preview and the export share one renderer, so the editor preview is a reliable check.

## Where things live

- **Rendering:** `lib/render/`. `layout.ts` decides where things go (text wrapping, auto-fit, device placement) and `geometry.ts` describes each device frame. Both are pure and unit-tested. `draw.ts` paints onto a canvas. Keep canvas calls out of the pure modules so they stay testable.
- **Devices and store specs:** `DEVICE_SPECS` in `lib/constants.ts`.
- **Templates and presets:** `TEMPLATE_PRESETS` and `THEME_PRESETS` in `lib/constants.ts`.
- **Pages:** `app/*/page.tsx`. Pages that read the local draft wait for `useHydrated()` and then read storage in lazy `useState` initialisers, so the static prerender never mismatches.

## Common changes

### Adding or updating a device

1. Add an entry to `DEVICE_SPECS`. `output` must be a size the store accepts, in portrait.
2. Pick an existing `frame` or add a new `FrameKind`. A new kind needs proportions in `RATIOS` (`lib/render/geometry.ts`) and buttons and cameras in `drawButtons`/`drawCameras` (`lib/render/draw.ts`).
3. `npm test` checks that every spec exports an accepted size and that the device fits on the canvas at every tilt.

### Adding a template

Add it to `TEMPLATE_PRESETS` **and** to `TEMPLATE_IDS` in `lib/autodesign.ts`, which lists the templates Claude can choose from. A test fails if the two lists drift apart.

### Store requirements changed?

Open an issue with a link to the official Apple or Google page. Spec fixes are the most valuable contributions.

## Style

- TypeScript strict mode. Prefer small pure functions for anything that isn't UI.
- Match the surrounding code's naming and comment density. Comments explain *why*, not *what*.
- No new runtime dependencies without discussion, because the static bundle is shipped to every user.

## License

By contributing, you agree that your contributions are licensed under the [AGPL-3.0](LICENSE).
