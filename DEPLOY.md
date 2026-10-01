# Deploy (GitHub Pages)

Fokus already ships a static deploy path: `.github/workflows/deploy.yml`.

- **Trigger**: push to `main` or manual `workflow_dispatch`
- **Build**: `npm ci` → `npm run build` → upload `./dist`
- **Base URL**: Vite `base` is `/fokus/` (see `vite.config.ts`)
- **Expected URL** (once Pages is enabled): `https://zarmih.github.io/fokus/`

## Current status (2026-10-01)

Workflow runs **fail** at `actions/configure-pages` with:

> Get Pages site failed. Please verify that the repository has Pages enabled and configured to build using GitHub Actions

The repository **does not** yet have a GitHub Pages site. No secrets are missing for this path — only a one-time repo setting.

## Exact next human step

1. Open **https://github.com/zarmih/fokus/settings/pages**
2. Under **Build and deployment → Source**, choose **GitHub Actions**
3. Save (no custom domain required)
4. Re-run the failed workflow: Actions → «Deploy static content to Pages» → latest run → **Re-run jobs**  
   (or push any commit to `main` / run workflow via `workflow_dispatch`)
5. Confirm the site at `https://zarmih.github.io/fokus/`

Optional: create an environment named `github-pages` if GitHub prompts for one (the workflow already references it).

## Local release assets (no hosting invent)

```bash
npm ci
npm run build   # writes dist/ with base /fokus/
npm test
```

Attach `dist/` (zip) to a GitHub Release if you want a downloadable build without Pages.
