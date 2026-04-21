# Deployment Checklist

## Pre-Deployment ✅

- [x] Project initialized with Wrangler
- [x] TypeScript configured for Web Workers
- [x] All 12 source files created and tested
- [x] Build successful (0 errors, 752 LOC)
- [x] All proxy protocols implemented
- [x] YAML renderer created (no dependencies)
- [x] Geolocation decoration integrated
- [x] Error handling implemented
- [x] Documentation completed

## Before Running npm run deploy

### 1. Prerequisites Checklist

- [ ] Node.js 18+ installed: `node --version`
- [ ] npm installed: `npm --version`
- [ ] Cloudflare account created (https://dash.cloudflare.com)
- [ ] Wrangler CLI available: `wrangler --version`

### 2. Local Setup

```bash
cd worker
npm install
npm run build
```

- [ ] Build completes without errors
- [ ] dist/ directory contains compiled JavaScript
- [ ] No TypeScript errors

### 3. Local Testing

```bash
npm run dev
```

Then test in another terminal:
```bash
curl "http://127.0.0.1:8787/?url=<test-subscription-url>" -o clash-profile.yaml
```

- [ ] Server starts without errors
- [ ] HTTP requests are handled
- [ ] YAML output is valid
- [ ] No TypeScript errors in console

### 4. Authentication

```bash
wrangler login
```

- [ ] Successfully logged into Cloudflare account
- [ ] Confirmed with: `wrangler whoami`

## Deployment

### Deploy to Default URL

```bash
npm run deploy
```

- [ ] Deployment completes successfully
- [ ] Output shows worker URL: `https://sub-converter-worker.<your-account>.workers.dev`
- [ ] No deployment errors

### Post-Deployment Verification

Test your deployed worker:

```bash
curl "https://sub-converter-worker.<your-account>.workers.dev/?url=<subscription-url>" \
  -o clash-profile.yaml

# Verify YAML is valid
head -20 clash-profile.yaml
```

- [ ] Worker responds with YAML
- [ ] YAML format is correct
- [ ] Proxies are parsed correctly
- [ ] No error messages in response

### Test Without Decoration

```bash
curl "https://sub-converter-worker.<your-account>.workers.dev/?url=<subscription-url>&decorate=false" \
  -o clash-profile.yaml
```

- [ ] Works without geolocation lookups
- [ ] Response is faster
- [ ] No country flag emojis in output

## Optional: Custom Domain Setup

### 1. Update wrangler.toml

```toml
[env.production]
routes = [
  { pattern = "sub.example.com/*", zone_name = "example.com" }
]
```

### 2. Deploy to Production

```bash
npm run deploy -- --env production
```

- [ ] Deployment to custom domain succeeds
- [ ] CNAME/DNS configured correctly
- [ ] Custom domain resolves

### 3. Test Custom Domain

```bash
curl "https://sub.example.com/?url=<subscription-url>" -o clash-profile.yaml
```

- [ ] Custom domain endpoint works
- [ ] Response is correct

## Clash Client Integration

### Add Subscription

In your Clash client:

1. Add Profile/Subscription
2. Enter URL: `https://sub-converter-worker.<your-account>.workers.dev/?url=<your-subscription-url>`
3. Update Profile
4. Select proxies and test

- [ ] Profile updates successfully
- [ ] Proxies are recognized
- [ ] Speed test group works
- [ ] Compact rules are applied

## Monitoring

### Check Logs

```bash
wrangler tail
```

- [ ] No errors in logs
- [ ] Response times are acceptable
- [ ] Requests are being processed

### Cloudflare Dashboard

Visit: https://dash.cloudflare.com → Workers → Your Worker

- [ ] View recent requests
- [ ] Check error rates
- [ ] Monitor performance

## Performance Benchmarks

Expected response times:
- Without decoration: lower than the old full-template build
- With decoration: higher because of geo-IP lookups
- Large subscriptions: improved by the compact template and reduced YAML size

Test and record:
- [ ] Response time without decoration: _____ ms
- [ ] Response time with decoration: _____ ms
- [ ] Largest subscription tested: _____ proxies, _____ ms

## Troubleshooting

If deployment fails:
- [ ] Check Cloudflare login status: `wrangler whoami`
- [ ] Verify account has workers enabled
- [ ] Check .env for credentials
- [ ] Try: `wrangler tail` to see errors

If requests fail:
- [ ] Check subscription URL is accessible
- [ ] Verify proxy format is supported
- [ ] Try `&decorate=false` to isolate issues
- [ ] Check YAML output format

## Completion

- [ ] All pre-deployment checks passed
- [ ] Local testing successful
- [ ] Deployment completed
- [ ] Post-deployment verification successful
- [ ] Clash client integration working
- [ ] Documentation reviewed
- [ ] Ready for production use

## Documentation References

- Setup: See `QUICKSTART.md`
- Full docs: See `README.md`
- API reference: See `README.md` → "API Usage"
- Troubleshooting: See `README.md` → "Troubleshooting"

---

**Next step:** Run `npm run deploy` when ready!

For detailed instructions, see `QUICKSTART.md`.
