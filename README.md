# Sub Converter

## Decode A Subscription To Clash YAML

This repo contains a small dependency-free Python script that:

- fetches a subscription URL
- decodes Base64 or plain-text subscription payloads
- parses common proxy node URI formats
- writes a Clash-compatible YAML file with `proxies`, `proxy-groups`, and `rules`

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

## Notes

- `.env` is ignored by git and should contain your real private subscription URL.
- `.env.example` is safe to commit and share.
- Generated `subscription.yaml` is ignored by git.

## License

See [LICENSE](./LICENSE).
