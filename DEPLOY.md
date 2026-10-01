# Deploy (GitHub Pages)

Fokus ships a static deploy path: `.github/workflows/deploy.yml`.

- **Trigger**: push to `main` or manual `workflow_dispatch`
- **Build**: `npm ci` → `npm run build` → upload `./dist`
- **Base URL**: Vite `base` is `/fokus/` (see `vite.config.ts`)
- **Site URL**: `https://zarmih.github.io/fokus/`

## Status (2026-10-01)

GitHub Pages **enabled** via API (`build_type: workflow`). Repository `homepage` points at the Pages URL.

| Check | Result |
| --- | --- |
| `GET /repos/zarmih/fokus/pages` | `build_type=workflow`, `html_url=https://zarmih.github.io/fokus/` |
| Source | GitHub Actions (not branch `/docs`) |
| Workflow | `.github/workflows/deploy.yml` → environment `github-pages` |

First green deploy after enablement may take a few minutes. If a run fails at `configure-pages`, re-check Settings → Pages → Source = **GitHub Actions**, then re-run the workflow.

## Soft-return / PWA install paths

- SW `notificationclick` with tag `fokus-soft-return` opens `?return=soft` under the registration scope (`/fokus/`).
- App boot consumes that query (see `consumeSoftReturnQuery`) and cleans the URL.
- When `beforeinstallprompt` is missing (typical iOS Safari), Today/Settings show **manual** install copy instead of hiding the card.

Phone GUI cannot be fully exercised on the agent box — coverage is unit tests for SW/manifest/reminder/install-path helpers.

## Local release assets

```bash
npm ci
npm run build   # writes dist/ with base /fokus/
npm test
```

Attach `dist/` (zip) to a GitHub Release if you want a downloadable build without Pages.
