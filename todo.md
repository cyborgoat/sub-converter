# TODO: turn this into a serverless subscription converter

## Goal

Keep the current GitHub Pages frontend under `/sub-converter/`, and add a cloud-hosted serverless `/sub` endpoint that can:

- accept the existing query shape (`target`, `url`, `insert`, `emoji`, `list`, `udp`, `tfo`, `scv`, `flag`)
- fetch upstream subscription URLs safely
- convert them into a Clash-compatible config response
- return a stable remote profile URL that Clash Verge can refresh

## Recommended target architecture

### Frontend

- Keep this repo as the UI for paste/decode/link generation
- Continue deploying the static site to GitHub Pages
- Set `VITE_CONVERTER_ORIGIN` to the real backend host once the serverless API exists

### Backend

- Build a serverless HTTP endpoint for `/sub`
- Prefer one of:
  1. Cloudflare Workers
  2. Vercel Functions
  3. Azure Functions
  4. AWS Lambda + API Gateway
- Decide whether the backend will:
  1. call an existing `subconverter` service, or
  2. implement the needed conversion logic directly

## Phase 1: backend design

- Choose the hosting platform
- Decide whether to proxy to `subconverter` or reimplement conversion
- Define supported query parameters and defaults
- Define response format and required headers
- Define limits for:
  - number of upstream URLs
  - timeout per fetch
  - total response size
  - rate limiting

## Phase 2: security and safety

- Validate all incoming URLs
- Block unsupported protocols and local/internal addresses
- Prevent SSRF to private networks and metadata endpoints
- Add allow/deny rules for upstream hosts if needed
- Add request timeout and upstream timeout handling
- Return explicit 4xx/5xx errors instead of silent fallbacks

## Phase 3: implementation

- Create a serverless route for `/sub`
- Parse and validate all existing query params
- Fetch one or more upstream subscriptions
- Merge upstream content when multiple URLs are provided
- Convert to Clash-compatible output
- Return correct content type and caching headers
- Log failures with enough detail for debugging

## Phase 4: frontend integration

- Point `VITE_CONVERTER_ORIGIN` at the deployed serverless backend
- Keep generated URLs under the current `/sub-converter` UX unless intentionally changed
- Add a short UI note explaining that generated remote URLs depend on the backend being live
- Optionally add a health check indicator for the converter host

## Phase 5: deployment and ops

- Create separate dev/staging/prod environments if the chosen platform supports it
- Add environment variables/secrets for backend config
- Add caching for upstream fetches and/or converted output
- Add basic monitoring and error tracking
- Document deploy, rollback, and debugging steps

## Phase 6: documentation

- Update `README.md` with the production architecture
- Document how `VITE_CONVERTER_ORIGIN` should be set
- Document backend limits, supported params, and known failure modes
- Add an example end-to-end import URL for Clash Verge

## Nice-to-have

- Cache popular subscriptions
- Support more output targets beyond Clash
- Add authentication or signed URLs for private use
- Add analytics for error rates and upstream latency
- Add backend tests with representative subscription fixtures

## Open questions to resolve later

- Which cloud platform do you want to deploy on?
- Do you want to depend on an existing `subconverter` instance or own the full conversion logic?
- Should the backend be public, rate-limited, or authenticated?
- Do you need custom domain routing so `/sub-converter/sub` works on `www.cyborgoat.com` directly?
