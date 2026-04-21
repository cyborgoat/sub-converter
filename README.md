# Sub Converter

## Decode A Subscription To Clash YAML

This repo contains a small dependency-free Python script that:

- fetches a subscription URL
- decodes Base64 or plain-text subscription payloads
- parses common proxy node URI formats
- merges a pre-generated policy template into the output
- writes a Clash-compatible YAML file with `proxies`, translated `proxy-groups`, and translated `rules`

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

## License

See [LICENSE](./LICENSE).
