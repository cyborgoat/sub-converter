# Sub-Converter Web

A small Vite + React frontend for the Cloudflare Worker. It exists to do one job:

1. accept a subscription URL from the user
2. URL-encode it safely
3. send it to the worker as `?url=...`
4. let the browser download the returned `clash.yaml`

## Local development

```bash
cd web
npm install
npm run dev
```

By default the worker URL field starts empty. To prefill it, create a `.env.local` file:

```bash
VITE_WORKER_URL=https://sub-converter-worker.example.workers.dev
```

## Build

```bash
npm run build
```

## GitHub Pages

The repo includes `.github/workflows/deploy-pages.yml` to deploy this app to GitHub Pages.

Optional repository variable:

- `VITE_WORKER_URL`: default worker endpoint shown in the app on GitHub Pages

If you do not set that variable, users can still paste the worker URL manually.
