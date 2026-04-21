# Sub-Converter Cloudflare Worker - Setup & Deployment

## Summary

The worker converts a subscription URL into a compact Clash profile at the edge. The current implementation is optimized for faster generation and smaller YAML output, especially for large subscriptions.

## Current Behavior

### Supported protocols

- ShadowSocks (SS)
- VMess
- ShadowSocksR (SSR)
- Trojan
- VLESS
- SOCKS5
- HTTP/HTTPS

### Output profile

- Clash-compatible YAML
- Compact proxy groups: `PROXY`, `AUTO`, `DIRECT_GROUP`, `REJECT_GROUP`, `FINAL`
- Compact routing rules
- Optional country-flag name decoration
- Download filename: `clash-profile`

## Getting Started

### 1. Enter the worker directory

```bash
cd sub-converter/worker
```

### 2. Install and build

```bash
npm install
npm run build
```

### 3. Test locally

```bash
npm run dev
```

Example:

```bash
curl "http://127.0.0.1:8787/?url=<subscription-url>" -o clash-profile.yaml
```

Fast path without decoration:

```bash
curl "http://127.0.0.1:8787/?url=<subscription-url>&decorate=false" -o clash-profile.yaml
```

### 4. Deploy

```bash
npm run deploy
```

## Usage

### Basic conversion

```bash
curl "https://sub-converter-worker.<your-account>.workers.dev/?url=https://example.com/subscription" \
  -o clash-profile.yaml
```

### Without decoration

```bash
curl "https://sub-converter-worker.<your-account>.workers.dev/?url=https://example.com/subscription&decorate=false" \
  -o clash-profile.yaml
```

### Clash client

Add this as the subscription URL:

```text
https://sub-converter-worker.<your-account>.workers.dev/?url=<your-subscription-url>
```

## API

**Endpoint:** `GET /?url=<subscription_url>[&decorate=true|false]`

Parameters:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `url` | string | required | Subscription URL to convert |
| `decorate` | boolean | true | Add country flag emojis to proxy names |

Response:

- `Content-Type: application/yaml; charset=utf-8`
- `Content-Disposition: attachment; filename=clash-profile`

## Why The Profile Is Compact

The older broader template duplicated many proxy names across multiple selector groups and carried thousands of rules. That made generation and YAML serialization unnecessarily slow for large subscriptions.

The current template keeps only the core selectors and a minimal rule set. This trades breadth for speed:

- faster response time
- smaller response body
- less worker CPU and memory pressure

## Performance Notes

- Fastest path: use `decorate=false`
- Decoration is best-effort and uses geo-IP lookups
- Large subscriptions benefit most from the compact template

## Architecture

1. Fetch subscription data
2. Decode Base64 when needed
3. Split and parse proxy entries
4. Convert entries to Clash proxy objects
5. Optionally decorate names
6. Expand `__ALL_PROXIES__` only for `PROXY` and `AUTO`
7. Render compact YAML
8. Return the profile as `clash-profile`

## License

See the project `LICENSE`.
