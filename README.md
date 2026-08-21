# njord

Web UI and frontend assets for the NJORD project.

## Development

`Redesign.html` loads a precompiled bundle, so **JSX edits do not appear until you build**:

```sh
npm install     # once
npm run watch   # rebuild bundle/ on every change to lib/ or screens/
```

Then serve the repo and open `Redesign.html`:

```sh
node scripts/serve.mjs      # http://localhost:8000/Redesign.html
```

Other commands:

| command | what it does |
| --- | --- |
| `npm run build` | one-off minified build into `bundle/` |
| `npm run dev` | unminified build + watch (readable stack traces) |

`bundle/` is committed on purpose: GitHub Pages serves the repo as-is with no build step, so a
stale bundle ships a stale site. **Run `npm run build` before committing.**

When you add a screen, add its path to `JS_FILES` in `build.mjs` (order matters — `lib/main.jsx`
stays last). The build fails loudly if two files declare the same top-level name, because the
bundle is one shared scope.

## Contents

- `assets/` — images and logos
- `bundle/` — build output (`app.js`, `app.css`), committed
- `lib/` — shared components, stores and styles; `lib/main.jsx` is the app entry
- `mobile/` — mobile-specific views
- `screens/` — screen components
- `scripts/` — dev tooling
- `vendor/` — React and lucide, pinned and self-hosted

## Why there is a build step

The page used to ship `@babel/standalone` (3.1 MB) and have it transpile ~1.1 MB of JSX in the
browser on every load, from 54 separate `<script type="text/babel">` tags. Compiling ahead of
time took the Lighthouse desktop performance score from 40 to 94 and total blocking time from
1,330 ms to 0 ms. See the comment block at the top of `build.mjs`.

## Known follow-up

`NJORD Mobile.html` still uses in-browser Babel across 18 scripts and has the same problem.
Extending `build.mjs` with a second bundle would fix it the same way.

## License

Add a license if desired.
