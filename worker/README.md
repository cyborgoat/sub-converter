# Sub-Converter Cloudflare Worker

A Cloudflare Workers-based service that converts proxy subscription URLs to compact Clash-compatible YAML profiles.

## Features

- ✅ Supports multiple proxy protocols: SS, VMess, SSR, Trojan, VLESS, SOCKS5, HTTP/HTTPS
- ✅ Automatic Base64 decoding of subscription data
- ✅ Converts to Clash YAML format using a compact shared policy template
- ✅ Optional country flag emoji decoration for proxy names (geolocation lookup)
- ✅ Graceful error handling and detailed error messages
- ✅ Serverless deployment on Cloudflare Workers (free tier available)

## Setup

### Prerequisites

- Node.js 18+ and npm
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account (free tier works)

### Installation

1. Navigate to the worker directory:
```bash
cd worker
```

2. Install dependencies:
```bash
npm install
```

3. Build the TypeScript:
```bash
npm run build
```

## Development

### Local Testing

Start the local development server:
```bash
npm run dev
```

This starts a local Cloudflare Workers environment at `http://127.0.0.1:8787`.

### Test with curl

Convert a subscription URL to Clash YAML:
```bash
curl "http://127.0.0.1:8787/?url=https://example.com/subscription" -o clash-profile.yaml
```

Disable country flag decoration:
```bash
curl "http://127.0.0.1:8787/?url=https://example.com/subscription&decorate=false" -o clash-profile.yaml
```

## Deployment

### Deploy to Cloudflare Workers

1. Authenticate with your Cloudflare account:
```bash
wrangler login
```

2. Deploy the worker:
```bash
npm run deploy
```

3. Your worker will be deployed to: `https://sub-converter-worker.<your-account>.workers.dev`

### Configure Custom Domain (Optional)

Edit `wrangler.toml` to add your custom domain:
```toml
[env.production]
routes = [
  { pattern = "sub.example.com/*", zone_name = "example.com" }
]
```

Then deploy to production:
```bash
npm run deploy -- --env production
```

## API Usage

### Endpoint
```
GET /?url=<subscription_url>[&decorate=true/false]
```

The `url` query parameter should be percent-encoded by the client. The new `web/` app handles that automatically.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | required | Subscription URL to convert |
| `decorate` | boolean | true | Add country flag emojis to proxy names |

### Response

Returns a Clash-compatible YAML configuration file with:
- Proxy list
- Compact proxy groups
- Compact routing rules
- Subscription metadata

### Examples

**Basic usage:**
```bash
curl "https://sub-converter-worker.yourname.workers.dev/?url=https%3A%2F%2Fexample.com%2Fsubscription" \
  -H "Accept: application/yaml" \
  -o clash-profile.yaml
```

**Without decoration:**
```bash
curl "https://sub-converter-worker.yourname.workers.dev/?url=https%3A%2F%2Fexample.com%2Fsubscription&decorate=false" \
  -o clash-profile.yaml
```

## Error Handling

- **400 Bad Request**: Missing `url` parameter or no valid proxies found
- **500 Internal Server Error**: Failed to fetch, decode, or parse subscription
- **HTTP errors**: Timeout or subscription server unreachable

All errors include descriptive messages for debugging.

## Supported Proxy Protocols

- **SS** (ShadowSocks)
- **VMess**
- **SSR** (ShadowSocksR)
- **Trojan**
- **VLESS**
- **SOCKS5**
- **HTTP/HTTPS**

## How It Works

1. Fetches the subscription from the provided URL
2. Auto-detects and decodes Base64 encoded subscriptions
3. Parses individual proxy entries (protocol-specific)
4. Converts to Clash proxy format
5. Optionally decorates proxy names with country flags (via ipwho.is API)
6. Expands `__ALL_PROXIES__` only inside `PROXY` and `AUTO`
7. Renders compact Clash YAML configuration
8. Returns with YAML content type and filename `clash-profile`

## Geolocation Decoration

When `decorate=true` (default), the worker looks up each proxy server's IP to determine its country and adds the corresponding flag emoji:
- 🇺🇸 US, 🇬🇧 GB, 🇯🇵 JP, 🇨🇳 CN, etc.
- Fallback: 🌍 for unknown countries
- Disabled: Pass `&decorate=false` to skip

**Note:** Geolocation lookups add latency. If speed is critical, disable with `&decorate=false`.

## Compact Template

The worker now uses a deliberately compact template for better performance on large subscriptions. It keeps only:

- `PROXY`
- `AUTO`
- `DIRECT_GROUP`
- `REJECT_GROUP`
- `FINAL`

The rule set is also intentionally minimal and focuses on private/local traffic plus a final fallback route.

## Architecture

```
src/
├── index.ts              Main Worker handler
├── services/
│   └── subscription.ts   Fetch, decode, split entries
├── parsers/
│   ├── index.ts          Entry dispatcher
│   ├── ss.ts             ShadowSocks parser
│   ├── vmess.ts          VMess parser
│   ├── ssr.ts            ShadowSocksR parser
│   └── generic.ts        Trojan, VLESS, SOCKS, HTTP
├── converters/
│   └── clash.ts          Build Clash config
├── renderers/
│   └── yaml.ts           YAML serialization
├── decorators/
│   └── flag.ts           Country flag decoration
└── utils/
    ├── types.ts          TypeScript interfaces
    └── url.ts            URL parsing helpers
```

## Building

The project uses TypeScript compiled to JavaScript for Workers.

```bash
npm run build      # Compile TypeScript to dist/
npm run dev        # Local development server
npm run deploy     # Deploy to Cloudflare Workers
```

## License

See LICENSE file in parent directory.

## Notes

- Worker execution timeout: 15 seconds (includes geolocation lookups)
- Maximum payload size: Standard Cloudflare Workers limits
- Free tier: 100,000 requests/day included
- Geolocation powered by ipwho.is (free, no auth required)
- YAML rendering uses custom renderer (no external dependencies)
