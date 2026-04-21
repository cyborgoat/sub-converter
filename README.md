# Sub Converter

## Decode A Subscription To Clash YAML

This repo contains a small dependency-free Python script that:

- fetches a subscription URL
- decodes Base64 or plain-text subscription payloads
- parses common proxy node URI formats
- merges a pre-generated policy template into the output
- writes a Clash-compatible YAML file with `proxies`, translated `proxy-groups`, and translated `rules`
- can decorate proxy names with country flag emojis after geo-IP lookup

## Setup

Create `.env` from `.env.example` and set `SUBSCRIPTION_URL`:

```bash
cp .env.example .env
```

Example `.env`:

```bash
SUBSCRIPTION_URL="https://example.com/path/to/your/subscription"
```

## Usage

Generate a Clash YAML file using the URL from `.env`:

```bash
python3 decode_subscription.py -o subscription.yaml
```

You can also pass a subscription URL directly:

```bash
python3 decode_subscription.py 'https://example.com/subscription' -o subscription.yaml
```

If `-o` is omitted, the default output path is `subscription.yaml`.

## Decorate Proxy Names

Use [decorate_subscription.py](./decorate_subscription.py) to add a country flag
emoji prefix to each proxy name based on its `server` IP address. The script
also updates matching entries inside `proxy-groups` so the final Clash YAML
stays consistent.

Decorate an existing generated YAML file:

```bash
python3 decorate_subscription.py --input subscription.yaml --output subscription.decorated.yaml
```

## One-Shot Shell Flow

Use [generate_decorated_subscription.sh](./generate_decorated_subscription.sh) to:

1. generate `subscription.yaml` with `decode_subscription.py`
2. decorate the proxy names with `decorate_subscription.py`
3. write the final YAML file

Example:

```bash
bash generate_decorated_subscription.sh subscription.yaml subscription.decorated.yaml
```

## IP Country Lookup

Use [lookup_ip_country.py](./lookup_ip_country.py) to resolve the country for
one or more IP addresses. It accepts IPs directly on the command line or
extracts `server:` IPs from a Clash YAML file and returns JSON output.

Look up IPs directly:

```bash
python3 lookup_ip_country.py 199.115.229.85 67.209.191.99
```

Or extract `server:` IPs from a generated Clash YAML file:

```bash
python3 lookup_ip_country.py --input subscription.yaml -o ip_countries.json
```

If `-o` is omitted, the JSON result is printed to stdout.

## Policy Template

The converter reads [clash_policy_template.yaml](./clash_policy_template.yaml),
which already contains the extracted `proxy-groups` and `rules` from your
reference config with Chinese group names translated to English.

The generated template is JSON-compatible YAML so the converter can load it
without third-party dependencies.
During conversion, the placeholder `__ALL_PROXIES__` inside the template is
expanded into the decoded proxy names from the current subscription.

## Notes

- `.env` is ignored by git and should contain your real private subscription URL.
- `.env.example` is safe to commit and share.
- Generated `subscription.yaml` is ignored by git.
- The converter requires `clash_policy_template.yaml` to be present.
- `lookup_ip_country.py` uses an online geo-IP API, so it requires network access when you run it.
- `decorate_subscription.py` also requires network access because it uses geo-IP lookups for proxy server IPs.

## License

See [LICENSE](./LICENSE).
