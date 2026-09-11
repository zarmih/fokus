# G5: Performance + Accessibility

Deep pass over the existing product. No new exercises.

## Performance

### Initial JS
The app previously statically imported every exercise engine via `registry.ts` → `dispatch.ts` → session / today / trainers / insights. With 80+ games that pulled engines, views and rAF loops into the first paint graph.

Now:

| Layer | File | When it loads |
|---|---|---|
| Manifests only | `src/exercises/catalog.ts` | Eager, tiny. Planning, catalog UI, insights. |
| Engine + view | `src/exercises/load-exercise.ts` (`import.meta.glob`, non-eager) | On session start, duel, or trainer hover/focus. |
| Full registry | `src/exercises/registry.ts` | Tests / eager dispatch only. Production screens do not import it. |

Screens other than Today are loaded with dynamic `import()` from `src/main.ts`. Duel and weekly review already were; session, result, progress, settings, trainers and onboarding now follow.

### Chunks and PWA cache
Vite names each engine `ex-<id>`. The service worker **precaches the shell** (HTML, CSS, core JS, logo, manifest) and **runtime-caches** exercise chunks and per-game icons on first use. First install no longer downloads 80 engines and 80 icons.

`shouldPrecache()` in `scripts/generate-sw.ts` is the allow-list.

### Rendering
- Google Fonts `@import` removed. System UI stack: no extra RTT, no FOIT, works offline.
- Trainer cards use `content-visibility: auto`.
- Decorative images use `decoding="async"` / `loading="lazy"`.
- `settings.ts` no longer imports `main.ts` (circular) for the install prompt — `src/pwa-install.ts` owns it.

## Accessibility

### Structure
- Skip link → `#main-content`
- `header` / `main` / `nav` landmarks
- Tab bar is real `<button>`s with `aria-current="page"`
- Persistent `aria-live` region (`#a11y-status`) outside `#app` so navigation does not wipe announcements
- `document.documentElement.lang` follows the profile locale
- Per-screen `document.title`

### Keyboard and focus
- Trainer cards are buttons; hover/focus prefetches the engine
- Filter chips expose `aria-pressed`
- Settings segmented controls are `radiogroup` / `radio`
- Dialogs (lifestyle prompt, fatigue) trap Tab and handle Escape
- Onboarding steps move focus to the heading
- Global `:focus-visible` ring

### Motion, contrast, input
- Existing `prefers-reduced-motion` kept; added `prefers-reduced-transparency` and `prefers-contrast: more`
- `color-scheme` follows theme (native form controls)
- `user-select: none` limited to play arena / tab bar, not the whole document
- Tab items meet a 44px minimum target
- File import control is labelled; duel code field has `inputmode` + accessible name

## Verification
```bash
npm test
npm run build
```

Catalog ids are asserted equal to the full registry so a new exercise cannot ship without a manifest row.

## Out of scope
- New exercises
- Rewriting individual game canvases (they already sit behind `engine` / `view`)
- Merging this PR without review
