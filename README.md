# sub-converter

Convert proxy subscriptions into Clash-compatible YAML with a TypeScript Cloudflare Worker and a small Vite web UI.

Supported protocols: `ss`, `vmess`, `ssr`, `trojan`, `vless`, `socks`, `http`, `https`

## Projects

- `worker/`: Cloudflare Worker that fetches a subscription, decodes it, converts entries to Clash proxies, expands the shared policy template, optionally decorates proxy names with country flags, and returns `clash.yaml`
- `web/`: React app that builds a request URL for the worker and uses the local worker service automatically in dev mode
- `clash_policy_template.yaml`: canonical policy template used to build `proxy-groups` and `rules`

## Worker

```bash
cd worker
npm install
npm run build
npm run dev
```

Local dev runs at `http://127.0.0.1:8787`.

Request shape:

```text
GET /?url=<percent-encoded-subscription-url>[&decorate=false]
```

The response is a Clash YAML file with:

- converted `proxies`
- policy-template-based `proxy-groups`
- policy-template `rules`
- `subscription-info` metadata including source type, source encoding, and node count

## Web UI

```bash
cd web
npm install
npm run dev
```

Worker endpoint resolution order:

1. `VITE_WORKER_URL` if set
2. `http://127.0.0.1:8787/` in Vite dev mode
3. `https://sub-converter-worker.cyborgoat.workers.dev/` in production

## Policy Template

`clash_policy_template.yaml` is JSON-compatible YAML. The placeholder `__ALL_PROXIES__` is expanded into the converted proxy names when building the final Clash config.

The worker bundles a generated copy of this template at `worker/src/config/policy-template.ts` so Cloudflare Workers do not depend on filesystem reads at runtime.

## Notes

- The worker is the source of truth for conversion now; the old Python package has been removed.
- Name decoration performs geo-IP lookups and can be disabled with `decorate=false`.
- The web build currently requires a Node version compatible with the installed Vite release.

## License

See [LICENSE](./LICENSE).
