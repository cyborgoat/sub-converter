# Sub-Converter Cloudflare Worker - Setup & Deployment

**Status:** ✅ Complete and ready for deployment

## What Was Created

A fully functional Cloudflare Workers application that converts proxy subscriptions to Clash-compatible YAML configurations. This enables you to use subscription URLs directly with Clash clients through a serverless edge function.

## Directory Structure

```
worker/                    # Cloudflare Worker project root
├── src/                   # TypeScript source code (12 files)
│   ├── index.ts          # Main Worker handler
│   ├── services/         # Subscription fetching & parsing
│   ├── parsers/          # Protocol-specific parsers (SS, VMess, SSR, etc.)
│   ├── converters/       # Clash YAML builder
│   ├── renderers/        # YAML serialization
│   ├── decorators/       # Country flag emojis
│   └── utils/            # Type definitions & helpers
├── dist/                 # Compiled JavaScript (auto-generated)
├── README.md             # Full documentation
├── QUICKSTART.md         # Getting started guide
├── wrangler.toml         # Wrangler configuration
├── tsconfig.json         # TypeScript config
└── package.json          # NPM dependencies
```

## Supported Features

### Proxy Protocols
- ✅ ShadowSocks (SS)
- ✅ VMess
- ✅ ShadowSocksR (SSR)
- ✅ Trojan
- ✅ VLESS
- ✅ SOCKS5
- ✅ HTTP/HTTPS

### Subscription Handling
- ✅ Automatic Base64 decoding
- ✅ Plain text subscriptions
- ✅ Protocol auto-detection
- ✅ Graceful error handling
- ✅ Skips invalid entries

### Output Features
- ✅ Clash-compatible YAML format
- ✅ Proxy groups (PROXY selector + AUTO speed test)
- ✅ Default routing rules
- ✅ Subscription metadata
- ✅ Optional country flag emoji decoration

## Getting Started (5 Steps)

### Step 1: Navigate to worker directory
```bash
cd sub-converter/worker
```

### Step 2: Install dependencies
```bash
npm install
```

### Step 3: Build TypeScript
```bash
npm run build
```

### Step 4: Test locally
```bash
npm run dev
```
Then test: `curl "http://localhost:8787/?url=<subscription-url>" -o clash.yaml`

### Step 5: Deploy to Cloudflare
```bash
npm run deploy
```

After deployment, your worker URL will be: `https://sub-converter-worker.<your-account>.workers.dev`

## Usage

### Basic conversion
```bash
curl "https://sub-converter-worker.<your-account>.workers.dev/?url=https://example.com/subscription" \
  -o clash.yaml
```

### Without country flags
```bash
curl "https://sub-converter-worker.<your-account>.workers.dev/?url=https://example.com/subscription&decorate=false" \
  -o clash.yaml
```

### In Clash client
Add subscription URL: `https://sub-converter-worker.<your-account>.workers.dev/?url=<your-subscription-url>`

The client will automatically fetch and convert the subscription in real-time.

## API Reference

**Endpoint:** `GET /?url=<subscription_url>[&decorate=true|false]`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | string | required | Subscription URL to convert |
| `decorate` | boolean | true | Add country flag emojis to proxy names |

**Response:** Clash YAML configuration with Content-Type: `application/yaml`

**Error Codes:**
- `400`: Missing URL or no valid proxies found
- `500`: Fetch failed, decode error, or parsing error

## Architecture

### How It Works
1. Accepts subscription URL via query parameter
2. Fetches subscription data
3. Auto-detects encoding (Base64 or plain text)
4. Splits and parses individual proxy entries
5. Converts each proxy to Clash format
6. Optionally decorates names with country flags (geo-IP lookup)
7. Builds complete Clash configuration
8. Renders as YAML
9. Returns with proper headers

### Key Design Decisions
- **No external dependencies** for YAML rendering (custom TypeScript renderer)
- **Cloudflare Workers** for serverless execution
- **Web APIs** only (fetch, URL, TextEncoder, atob/btoa)
- **TypeScript** for type safety and maintainability
- **Modular structure** for easy protocol additions

## Implementation Details

### Parsers
Each proxy protocol has its own parser module:
- `parsers/ss.ts` - Parses ShadowSocks URLs with Base64 credentials
- `parsers/vmess.ts` - Decodes JSON-based VMess configs
- `parsers/ssr.ts` - Handles ShadowSocksR format
- `parsers/generic.ts` - Standard URL-based protocols (Trojan, VLESS, SOCKS, HTTP)

### Converters
- `converters/clash.ts` - Builds Clash proxy objects with protocol-specific options
- Handles defaults (UDP enabled, TFO disabled, cert verification skipped where needed)

### Rendering
- `renderers/yaml.ts` - Custom YAML renderer (no dependencies)
- Handles nested objects, arrays, string escaping
- Outputs valid Clash YAML format

### Decoration
- `decorators/flag.ts` - Geolocation-based country flag emojis
- Uses ipwho.is API (free, no auth required)
- Gracefully degrades if lookup fails

## Development

### Build commands
```bash
npm run build       # Compile TypeScript to dist/
npm run dev         # Local development server on :8787
npm run deploy      # Deploy to Cloudflare Workers
```

### Modify code
1. Edit files in `src/`
2. Run `npm run build`
3. Test locally: `npm run dev`
4. Deploy: `npm run deploy`

### Add new protocol
1. Create `src/parsers/newproto.ts`
2. Implement parser function
3. Register in `src/parsers/index.ts`
4. Add Clash conversion in `src/converters/clash.ts`

## Deployment

### Prerequisites
- Node.js 18+
- npm
- Cloudflare account (free tier supported)

### Deploy
```bash
wrangler login                  # One-time setup
cd worker
npm run deploy
```

### Custom Domain (Optional)
Edit `wrangler.toml`:
```toml
[env.production]
routes = [
  { pattern = "sub.example.com/*", zone_name = "example.com" }
]
```

Deploy to production: `npm run deploy -- --env production`

## Limitations & Notes

- **Timeout:** 15 seconds (includes geolocation lookups)
- **Payload size:** Standard Cloudflare Workers limits
- **Free tier:** 100,000 requests/day
- **Geolocation:** ipwho.is API (best-effort, may timeout)
- **Worker runtime:** V8 engine, no Node.js APIs

## Troubleshooting

**Build errors?**
```bash
rm -rf dist node_modules
npm install
npm run build
```

**Worker not responding?**
- Check Cloudflare account login: `wrangler whoami`
- Verify deployment: `wrangler list`
- Check logs in Cloudflare Dashboard > Workers

**Subscription parsing fails?**
- Test URL accessibility: `curl -I <subscription-url>`
- Try without decoration: `?url=...&decorate=false`
- Check subscription format (valid Base64 or plain text)

## Performance Tips

- **Disable decoration** for fastest response: `&decorate=false`
- **Cache YAML** on your client if fetching frequently
- **Use direct subscription URLs** when possible (faster than proxies)

## License

Inherits from parent sub-converter project. See LICENSE file.

## Files Summary

| File | Purpose |
|------|---------|
| `src/index.ts` | Main Worker handler, request routing |
| `src/services/subscription.ts` | HTTP fetching, Base64 decoding, entry splitting |
| `src/parsers/ss.ts` | ShadowSocks parser |
| `src/parsers/vmess.ts` | VMess JSON parser |
| `src/parsers/ssr.ts` | ShadowSocksR parser |
| `src/parsers/generic.ts` | URL-based protocol parsers |
| `src/parsers/index.ts` | Parser dispatcher/router |
| `src/converters/clash.ts` | Clash config builder |
| `src/renderers/yaml.ts` | YAML serializer |
| `src/decorators/flag.ts` | Country flag decoration |
| `src/utils/types.ts` | TypeScript interfaces |
| `src/utils/url.ts` | URL utilities |

---

**Next steps:** 
1. `cd worker && npm install`
2. `npm run build`
3. `npm run dev` (test locally)
4. `npm run deploy` (deploy to Cloudflare)

For more details, see `worker/README.md` and `worker/QUICKSTART.md`.
