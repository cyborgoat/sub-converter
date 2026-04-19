# sub-converter

Vite + React app that turns pasted **HTTP(S) subscription URLs** into:

1. An **HTTPS profile URL** on **the same host as this app** (under a `/sub`-style path), ready to paste as a remote subscription in **Clash Verge**.
2. A **`clash://install-config?url=…`** link for clients that register that URL scheme.

All work happens in the page as string composition: your subscriptions are not requested from this app, only encoded into the generated links.

### Converter host

- **Runtime (default):** the converter base is derived from the page you opened (`origin` + Vite `base` path), so a project site at `https://<user>.github.io/<repo>/` becomes `https://<user>.github.io/<repo>`.
- **Build-time (optional):** set repository variable **`VITE_CONVERTER_ORIGIN`** (no trailing slash) to override, for example if you use a custom domain or a user-site repo at the domain root.
- **GitHub Actions:** the deploy workflow sets `VITE_CONVERTER_ORIGIN` automatically from the repository (`https://<owner>.github.io/<repo>` or `https://<owner>.github.io` when the repo is `<owner>.github.io`). If `VITE_CONVERTER_ORIGIN` is set under **Settings → Secrets and variables → Actions → Variables**, that value wins.

The static UI does not implement `/sub` by itself; whatever serves your Pages site must also provide a compatible converter endpoint at that URL if clients should fetch a real config.

## Local development

```bash
npm install
npm run dev
```

With no `VITE_CONVERTER_ORIGIN` at build time, the converter host is taken from the tab you have open (e.g. `http://localhost:5173`). To match production while developing, add `.env.local`:

```bash
VITE_CONVERTER_ORIGIN=https://<user>.github.io/<repo>
```

Use your real Pages URL (no trailing slash).

## Production build

```bash
npm run build
npm run preview
```

## GitHub Pages

- The Vite `base` path defaults to `/sub-converter/` in production builds so assets resolve on `https://<user>.github.io/sub-converter/`. If your repository name differs, edit `repo` in `vite.config.ts` or set `VITE_BASE` when building (for example `VITE_BASE=/my-repo/ npm run build`).
- Enable **GitHub Pages** → **Build and deployment** → Source: **GitHub Actions**.
- Push to `main`; the workflow in `.github/workflows/deploy-pages.yml` builds and deploys the `dist` folder.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`)
- UI primitives in the style of shadcn/ui (Radix, `class-variance-authority`, `tailwind-merge`)

## License

See [LICENSE](./LICENSE).
