# sub-converter

Convert proxy subscriptions into Clash-compatible YAML.

This repo now includes:

- the original Python converter
- a Cloudflare Worker in `worker/`
- a Vite + React web UI in `web/` for safe worker requests

**Supports:** `ss` · `vmess` · `ssr` · `trojan` · `vless` · `socks` · `http/https`

## Setup

Requires Python 3.9+. No packages to install.

```bash
cp .env.example .env
# edit .env with your subscription URL or Base64 string
```

## Usage

### 1. Decode a subscription

From `.env` config:

```bash
python3 decode_subscription.py
```

Pass a URL directly:

```bash
python3 decode_subscription.py 'https://example.com/subscription'
```

Pass a Base64 string directly:

```bash
python3 decode_subscription.py 'c3M6Ly8...' --source-type base64
```

The `--source-type` flag accepts `auto` (default), `url`, or `base64`. In `auto` mode, `http(s)` values are fetched and everything else is decoded as Base64.

Output defaults to `subscription.yaml`. Change it with `-o`:

```bash
python3 decode_subscription.py -o my.yaml
```

### 2. Decorate proxy names with country flags

Prefixes each proxy name with a country flag emoji (e.g. `🇺🇸 Node-1`) based on a geo-IP lookup of the server IP. Also updates all matching entries inside `proxy-groups`.

```bash
python3 decorate_subscription.py --input subscription.yaml --output subscription.decorated.yaml
```

### 3. One-shot: decode + decorate

```bash
bash generate_decorated_subscription.sh
# writes subscription.yaml then subscription.decorated.yaml
```

Custom output paths:

```bash
bash generate_decorated_subscription.sh my.yaml my.decorated.yaml
```

### 4. IP country lookup

Look up one or more IPs directly:

```bash
python3 lookup_ip_country.py 1.2.3.4 5.6.7.8
```

Extract all `server:` IPs from an existing Clash YAML and save results:

```bash
python3 lookup_ip_country.py --input subscription.yaml -o ip_countries.json
```

Without `-o`, results print as JSON to stdout.

## Web UI

The `web/` app gives users a simple browser interface for the Cloudflare Worker:

```bash
cd web
npm install
npm run dev
```

It URL-encodes the subscription URL and returns the final worker URL, using this
fixed endpoint:

```text
https://sub-converter-worker.cyborgoat.workers.dev
```

## Cloudflare Worker

The Worker project lives in `worker/`:

```bash
cd worker
npm install
npm run build
npm run dev
```

The worker expects:

```text
GET /?url=<percent-encoded-subscription-url>[&decorate=false]
```

## Configuration (`.env`)

| Variable | Description |
|---|---|
| `SUBSCRIPTION_SOURCE_TYPE` | `auto` (default), `url`, or `base64` |
| `SUBSCRIPTION_URL` | Subscription URL (used when source type is `url` or `auto`) |
| `SUBSCRIPTION_BASE64` | Inline Base64 string (used when source type is `base64` or `auto`) |
| `SUBSCRIPTION_SOURCE` | Generic fallback used by all modes |

## Policy Template

`clash_policy_template.yaml` contains pre-defined `proxy-groups` and `rules`. The placeholder `__ALL_PROXIES__` inside it is expanded into the full decoded proxy list at conversion time.

The file is JSON-compatible YAML so it loads without any third-party library. Edit it to customise your routing rules.

## Code Structure

```
decode_subscription.py       ← entry point (thin wrapper)
decorate_subscription.py     ← entry point (thin wrapper)
lookup_ip_country.py         ← entry point (thin wrapper)
generate_decorated_subscription.sh
clash_policy_template.yaml

src/sub_converter/
├── utils.py                 pad_base64, parse_bool, clean_query, decode_name
├── config/
│   └── settings.py          load_env_file, parse_source_type, is_probable_url
├── services/
│   ├── subscription.py      HTTP fetch, Base64 decode, entry splitting
│   └── geo_ip.py            ipwho.is lookup, IP extraction
├── parsers/
│   ├── __init__.py          parse_entry() dispatcher
│   ├── ss.py                ShadowSocks
│   ├── vmess.py             VMess
│   ├── ssr.py               ShadowSocksR
│   └── generic.py           trojan / vless / socks / http
├── converters/
│   └── clash.py             node → Clash proxy dict, config assembly
├── renderers/
│   └── yaml.py              stdlib YAML serialiser
├── decorators/
│   └── flag.py              country flag emoji decoration
└── cli/
    ├── decode.py            decode main()
    ├── decorate.py          decorate main()
    └── lookup.py            lookup main()
```

To add a new proxy protocol: create `src/sub_converter/parsers/myproto.py`, register it in `parsers/__init__.py`, then add a matching branch in `converters/clash.py`.

## Notes

- `.env` is git-ignored. `.env.example` is safe to commit.
- `subscription.yaml` and `subscription.decorated.yaml` are git-ignored.
- Decoration and IP lookup require network access (queries `ipwho.is`).

## License

See [LICENSE](./LICENSE).
