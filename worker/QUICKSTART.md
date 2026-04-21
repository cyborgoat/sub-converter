# Cloudflare Worker Quick Start Guide

## What's been created

Your Cloudflare Worker project is now ready to convert proxy subscriptions to Clash YAML profiles. Here's the complete structure:

```
worker/
├── src/                          # TypeScript source code
│   ├── index.ts                  # Main Worker handler
│   ├── services/
│   │   └── subscription.ts       # Fetch & decode subscriptions
│   ├── parsers/
│   │   ├── index.ts              # Protocol dispatcher
│   │   ├── ss.ts                 # ShadowSocks
│   │   ├── vmess.ts              # VMess
│   │   ├── ssr.ts                # ShadowSocksR
│   │   └── generic.ts            # Trojan, VLESS, SOCKS, HTTP/HTTPS
│   ├── converters/
│   │   └── clash.ts              # Clash config builder
│   ├── renderers/
│   │   └── yaml.ts               # YAML serializer
│   ├── decorators/
│   │   └── flag.ts               # Country flag emojis
│   └── utils/
│       ├── types.ts              # TypeScript interfaces
│       └── url.ts                # URL utilities
├── dist/                         # Compiled JavaScript (build output)
├── wrangler.toml                 # Wrangler configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies & scripts
└── README.md                     # Full documentation
```

## Quick Start

### 1. Install dependencies
```bash
cd worker
npm install
```

### 2. Build TypeScript
```bash
npm run build
```

### 3. Test locally
```bash
npm run dev
```

Then visit: `http://127.0.0.1:8787/?url=<subscription_url>`

If the subscription URL already contains its own query string, percent-encoding it is safest, for example:
`http://127.0.0.1:8787/?url=https%3A%2F%2Fexample.com%2Fsub%3Fservice%3D123%26id%3Dabc`

### 4. Deploy to Cloudflare Workers
```bash
npm run deploy
```

After deployment, your worker will be live at:
`https://sub-converter-worker.<your-account>.workers.dev`

## API Usage Examples

### Convert subscription to Clash YAML
```bash
curl "https://sub-converter-worker.yourname.workers.dev/?url=https://example.com/subscription" \
  -o clash-profile.yaml
```

### Without country flag decoration
```bash
curl "https://sub-converter-worker.yourname.workers.dev/?url=https://example.com/subscription&decorate=false" \
  -o clash-profile.yaml
```

### Using with Clash client
1. Get your worker URL: `https://sub-converter-worker.<your-account>.workers.dev`
2. In Clash app, add subscription: `https://sub-converter-worker.<your-account>.workers.dev/?url=<your-subscription-url>`
3. Update profile - Clash will use the Cloudflare Worker to convert in real-time!

## Features

✅ **Proxy Protocol Support:**
- ShadowSocks (SS)
- VMess  
- ShadowSocksR (SSR)
- Trojan
- VLESS
- SOCKS5
- HTTP/HTTPS

✅ **Smart Subscription Handling:**
- Auto-detect Base64 encoded subscriptions
- Automatic protocol detection
- Graceful error handling for invalid entries

✅ **Clash Integration:**
- Compact YAML configuration with core proxy groups
- Automatic speed test group (AUTO)
- Minimal routing rules for speed
- Proxy name management

✅ **Optional Decorations:**
- Country flag emojis based on geolocation
- Lookup via ipwho.is API (free, no auth)
- Can be disabled with `&decorate=false`

## Deployment Options

### Free Tier (Default)
- 100,000 requests/day
- Deploy with: `npm run deploy`
- URL: `https://sub-converter-worker.<your-account>.workers.dev`

### Custom Domain
Edit `wrangler.toml`:
```toml
[env.production]
routes = [
  { pattern = "sub.example.com/*", zone_name = "example.com" }
]
```

Deploy: `npm run deploy -- --env production`

## Development Tips

- **Local testing**: `npm run dev` then test with curl
- **See logs**: Browser DevTools Network tab when testing
- **TypeScript checking**: `npm run build` validates types
- **Rebuild**: `npm run build` after any changes to `src/`

## Next Steps

1. ✅ Build: `npm run build`
2. 🔧 Test locally: `npm run dev`
3. 🚀 Deploy: `npm run deploy`
4. 📋 Get your worker URL from Cloudflare Dashboard
5. 🎯 Use with Clash: `https://sub-converter-worker.<your-account>.workers.dev/?url=...`

## Troubleshooting

**Build fails?**
- Check Node.js version: `node --version` (need 18+)
- Clear build: `rm -rf dist node_modules && npm install && npm run build`

**Worker not working?**
- Check wrangler login: `wrangler whoami`
- View logs: Check Cloudflare Dashboard > Workers > Logs

**Subscription parsing fails?**
- Test URL with: `curl -I <subscription-url>` (verify it's accessible)
- Try with `&decorate=false` to isolate parsing issues

## Architecture Notes

The worker uses:
- **No external dependencies** for YAML rendering (custom renderer)
- **Standard Web APIs** (fetch, URL, TextEncoder, etc.)
- **Native JavaScript** Base64 codec (atob/btoa)
- **Cloudflare Workers runtime** (V8 engine)

All parsing logic is implemented in TypeScript for serverless execution.

## License & Credits

Created for Cloudflare Workers platform. Inherits license from parent sub-converter project.

---

**Ready to deploy?** Run: `npm run deploy`

For full documentation, see `README.md` in this directory.
