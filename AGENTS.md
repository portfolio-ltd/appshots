<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project notes

- Fully static, client-only app (`output: "export"`): no API routes, server actions, middleware or env secrets.
- `lib/render/` is the single renderer shared by the editor preview and the export. Keep `layout.ts` and `geometry.ts` pure (no canvas/DOM), with unit tests in `tests/`.
- Pages that read the local draft gate on `useHydrated()` and read storage in lazy `useState` initialisers — don't `setState` synchronously inside effects (the lint config rejects it).
- Before finishing: `npm run lint && npm run typecheck && npm test && npm run build`.
