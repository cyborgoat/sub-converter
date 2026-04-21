# Sub-Converter Web

A small Vite + React frontend for the Cloudflare Worker. It exists to do one job:

1. accept a subscription URL from the user
2. URL-encode it safely
3. output the final worker URL for downloading the returned compact Clash profile

## Local development

```bash
cd web
npm install
npm run dev
```

Worker endpoint resolution order:

```text
VITE_WORKER_URL
http://127.0.0.1:8787/          # when running in Vite dev mode
https://sub-converter-worker.cyborgoat.workers.dev/
```

## Build

```bash
npm run build
```

The current Vite toolchain requires a Node version compatible with the installed Vite release.

## GitHub Pages

The repo includes `.github/workflows/deploy-pages.yml` to deploy this app to GitHub Pages.
