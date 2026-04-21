# Sub-Converter Web

A small Vite + React frontend for the Cloudflare Worker. It exists to do one job:

1. accept a subscription URL from the user
2. URL-encode it safely
3. output the final worker URL for downloading the returned `clash.yaml`

## Local development

```bash
cd web
npm install
npm run dev
```

The app uses this fixed worker endpoint:

```text
https://sub-converter-worker.cyborgoat.workers.dev
```

## Build

```bash
npm run build
```

## GitHub Pages

The repo includes `.github/workflows/deploy-pages.yml` to deploy this app to GitHub Pages.
