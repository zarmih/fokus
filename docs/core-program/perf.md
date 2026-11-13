# Startup performance: before / after (0.7.0)

Harness: `scripts/perf/perf.mjs`. Headless Chromium (Playwright 1.64), 390×844, ~Fast 3G (150 ms RTT, 1.6 Mbit/s), CPU ×4 slowdown,
service worker blocked (cold start). Median of 7 runs. Server: `vite preview` of a production build.

- Before: `main` = `1239933` (2026-11-12, before the core work).
- After: `main` = `12877ab` (2026-11-13, release 0.7.0).

## First launch → onboarding

| | FCP, ms | DOMContentLoaded, ms | load, ms | JS files | requests | JS KB |
|---|---:|---:|---:|---:|---:|---:|
| Before | 1648 | 6125 | 6133 | 185 | 189 | 909 |
| After  | 1316 | 1410 | 1712 | 8 | 12 | 386 |

## Returning visit → Today (warm HTTP cache)

| | FCP, ms | DOMContentLoaded, ms | load, ms |
|---|---:|---:|---:|
| Before | 508 | 5285 | 5483 |
| After  | 388 | 490 | 686 |

## Bundle (dist/assets)

| | JS files | JS raw KB | JS gzip KB | JS referenced by index.html | CSS raw / gzip KB |
|---|---:|---:|---:|---:|---:|
| Before | 199 | 1221.6 | 473.4 | 183 files, 890.9 KB raw / 361.0 KB gzip | 536.7 / 69.8 |
| After  | 203 | 1228.7 | 472.8 | 5 files, 370.9 KB raw / 117.9 KB gzip | 537.3 / 69.9 |

Why: the app now reads light exercise manifests (`src/exercises/manifests.generated.ts`) and loads exercise code on
demand (`loadExercise`). The service worker still precaches the shell, the 15 core and the calibration-probe exercises,
so the first workout works offline. Other catalog exercises are cached the first time they are opened.

Not improved: CSS is still one 537 KB file (70 KB gzip).
