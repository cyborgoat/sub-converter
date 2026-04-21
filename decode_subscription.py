#!/usr/bin/env python3
"""Fetch and decode a subscription URL into a Clash-compatible YAML file."""

from __future__ import annotations

import argparse
import base64
import binascii
import json
import os
import re
import ssl
import sys
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, unquote, urlparse
from urllib.request import Request, urlopen


def load_env_file(path: str = ".env") -> None:
    env_path = Path(path)
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if not key or key in os.environ:
            continue
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]
        os.environ[key] = value


def fetch_subscription(url: str, timeout: int) -> bytes:
    request = Request(
        url,
        headers={
            "User-Agent": "sub-converter/1.0 (+https://local.script)",
            "Accept": "*/*",
        },
    )
    context = ssl.create_default_context()
    with urlopen(request, timeout=timeout, context=context) as response:
        return response.read()


def pad_base64(value: str) -> str:
    trimmed = re.sub(r"\s+", "", value.strip()).replace("-", "+").replace("_", "/")
    if not trimmed:
        return trimmed
    padding = (-len(trimmed)) % 4
    return trimmed + ("=" * padding)


def parse_bool(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def clean_query(parsed_query: str) -> dict[str, str]:
    if not parsed_query:
        return {}
    return {key: value for key, value in parse_qsl(parsed_query, keep_blank_values=True)}


def decode_name(fragment: str) -> str | None:
    if not fragment:
        return None
    return unquote(fragment.strip()) or None


def try_decode_base64_text(raw: bytes) -> str | None:
    text = raw.decode("utf-8", errors="ignore").strip()
    if not text:
        return ""

    candidate = pad_base64(text)
    if not re.fullmatch(r"[A-Za-z0-9+/=]+", candidate):
        return None

    try:
        decoded = base64.b64decode(candidate, validate=False)
    except (binascii.Error, ValueError):
        return None

    decoded_text = decoded.decode("utf-8", errors="ignore").strip()
    if not decoded_text:
        return None

    known_prefixes = (
        "ss://",
        "ssr://",
        "vmess://",
        "vless://",
        "trojan://",
        "socks://",
        "http://",
        "https://",
        "hy2://",
        "hysteria2://",
        "tuic://",
        "wireguard://",
    )
    if decoded_text.startswith(known_prefixes) or "\n" in decoded_text:
        return decoded_text

    return None


def subscription_text(raw: bytes) -> tuple[str, str]:
    decoded = try_decode_base64_text(raw)
    if decoded is not None:
        return decoded, "base64"
    return raw.decode("utf-8", errors="ignore"), "plain"


def split_entries(text: str) -> list[str]:
    entries: list[str] = []
    for line in text.splitlines():
        item = line.strip()
        if not item or item.startswith("#"):
            continue
        entries.append(item)
    return entries


def parse_netloc_url(url: str) -> dict[str, Any]:
    parsed = urlparse(url)
    result: dict[str, Any] = {
        "scheme": parsed.scheme,
        "name": decode_name(parsed.fragment),
        "server": parsed.hostname,
        "port": parsed.port,
        "query": clean_query(parsed.query),
        "raw": url,
    }
    if parsed.username is not None:
        result["username"] = unquote(parsed.username)
    if parsed.password is not None:
        result["password"] = unquote(parsed.password)
    return result


def parse_ss(url: str) -> dict[str, Any]:
    body = url[len("ss://") :]
    name = None
    if "#" in body:
        body, fragment = body.split("#", 1)
        name = decode_name(fragment)

    query = {}
    if "?" in body:
        body, query_string = body.split("?", 1)
        query = clean_query(query_string)

    decoded_body = body
    if "@" not in body:
        maybe = pad_base64(body)
        try:
            decoded_body = base64.b64decode(maybe).decode("utf-8", errors="strict")
        except (binascii.Error, ValueError, UnicodeDecodeError):
            decoded_body = body

    if "@" not in decoded_body or ":" not in decoded_body:
        raise ValueError("invalid ss entry")

    userinfo, hostinfo = decoded_body.rsplit("@", 1)
    method, password = userinfo.split(":", 1)
    server, port_text = hostinfo.rsplit(":", 1)

    return {
        "scheme": "ss",
        "name": name,
        "cipher": method,
        "password": password,
        "server": server,
        "port": int(port_text),
        "query": query,
        "raw": url,
    }


def parse_vmess(url: str) -> dict[str, Any]:
    payload = url[len("vmess://") :]
    decoded = base64.b64decode(pad_base64(payload)).decode("utf-8", errors="strict")
    data = json.loads(decoded)
    data["scheme"] = "vmess"
    data["raw"] = url
    if "ps" in data and "name" not in data:
        data["name"] = data["ps"]
    return data


def parse_ssr(url: str) -> dict[str, Any]:
    payload = base64.b64decode(pad_base64(url[len("ssr://") :])).decode(
        "utf-8", errors="strict"
    )
    main, _, query_string = payload.partition("/?")
    parts = main.split(":")
    if len(parts) < 6:
        raise ValueError("invalid ssr entry")

    server, port, protocol, method, obfs, password_b64 = parts[:6]
    password = base64.b64decode(pad_base64(password_b64)).decode(
        "utf-8", errors="ignore"
    )
    query = clean_query(query_string)

    decoded_query: dict[str, Any] = {}
    for key, value in query.items():
        if key in {"remarks", "group", "protoparam", "obfsparam"}:
            try:
                decoded_query[key] = base64.b64decode(pad_base64(value)).decode(
                    "utf-8", errors="ignore"
                )
            except (binascii.Error, ValueError):
                decoded_query[key] = value
        else:
            decoded_query[key] = value

    return {
        "scheme": "ssr",
        "name": decoded_query.get("remarks"),
        "server": server,
        "port": int(port),
        "protocol": protocol,
        "cipher": method,
        "obfs": obfs,
        "password": password,
        "query": decoded_query,
        "raw": url,
    }


def parse_entry(url: str) -> dict[str, Any]:
    if url.startswith("vmess://"):
        return parse_vmess(url)
    if url.startswith("ss://"):
        return parse_ss(url)
    if url.startswith("ssr://"):
        return parse_ssr(url)
    return parse_netloc_url(url)


def make_name(node: dict[str, Any], index: int) -> str:
    name = node.get("name")
    if isinstance(name, str) and name.strip():
        return name.strip()
    server = node.get("server") or "node"
    port = node.get("port") or "0"
    return f"{node.get('scheme', 'proxy')}-{index}@{server}:{port}"


def clash_proxy_from_node(node: dict[str, Any], index: int) -> dict[str, Any]:
    scheme = str(node.get("scheme", "")).lower()
    name = make_name(node, index)

    if scheme == "ss":
        proxy = {
            "name": name,
            "type": "ss",
            "server": node["server"],
            "port": int(node["port"]),
            "cipher": node["cipher"],
            "password": node["password"],
            "udp": True,
            "tfo": False,
        }
        plugin = node.get("query", {}).get("plugin")
        if plugin:
            proxy["plugin"] = plugin
        plugin_opts = node.get("query", {}).get("plugin-opts")
        if plugin_opts:
            proxy["plugin-opts"] = {"mode": plugin_opts}
        return proxy

    if scheme == "vmess":
        proxy = {
            "name": name,
            "type": "vmess",
            "server": node["add"],
            "port": int(node["port"]),
            "uuid": node["id"],
            "alterId": int(node.get("aid", 0) or 0),
            "cipher": node.get("scy") or "auto",
            "tls": parse_bool(node.get("tls")),
            "skip-cert-verify": True,
            "udp": True,
            "tfo": False,
        }
        network = node.get("net")
        if network and network != "tcp":
            proxy["network"] = network
        if node.get("path") and network == "ws":
            proxy["ws-opts"] = {"path": node["path"]}
            host = node.get("host")
            if host:
                proxy["ws-opts"]["headers"] = {"Host": host}
        if node.get("host") and network != "ws":
            proxy["servername"] = node["host"]
        if node.get("sni"):
            proxy["servername"] = node["sni"]
        return proxy

    if scheme == "trojan":
        proxy = {
            "name": name,
            "type": "trojan",
            "server": node["server"],
            "port": int(node["port"]),
            "password": node["password"],
            "udp": True,
            "skip-cert-verify": True,
        }
        if node.get("query", {}).get("sni"):
            proxy["sni"] = node["query"]["sni"]
        return proxy

    if scheme == "vless":
        proxy = {
            "name": name,
            "type": "vless",
            "server": node["server"],
            "port": int(node["port"]),
            "uuid": node["username"],
            "udp": True,
            "tls": parse_bool(node.get("query", {}).get("security") == "tls"),
        }
        if node.get("query", {}).get("flow"):
            proxy["flow"] = node["query"]["flow"]
        if node.get("query", {}).get("sni"):
            proxy["servername"] = node["query"]["sni"]
        return proxy

    if scheme == "socks":
        return {
            "name": name,
            "type": "socks5",
            "server": node["server"],
            "port": int(node["port"]),
            "username": node.get("username"),
            "password": node.get("password"),
            "udp": True,
        }

    if scheme in {"http", "https"}:
        proxy = {
            "name": name,
            "type": "http",
            "server": node["server"],
            "port": int(node["port"]),
        }
        if node.get("username") is not None:
            proxy["username"] = node["username"]
        if node.get("password") is not None:
            proxy["password"] = node["password"]
        if scheme == "https":
            proxy["tls"] = True
            proxy["skip-cert-verify"] = True
        return proxy

    if scheme == "ssr":
        return {
            "name": name,
            "type": "ssr",
            "server": node["server"],
            "port": int(node["port"]),
            "cipher": node["cipher"],
            "password": node["password"],
            "protocol": node["protocol"],
            "obfs": node["obfs"],
            "udp": True,
        }

    raise ValueError(f"unsupported scheme: {scheme}")


def prune_none(value: Any) -> Any:
    if isinstance(value, dict):
        cleaned = {}
        for key, item in value.items():
            if item is None:
                continue
            cleaned[key] = prune_none(item)
        return cleaned
    if isinstance(value, list):
        return [prune_none(item) for item in value]
    return value


def yaml_scalar(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    return json.dumps(str(value), ensure_ascii=False)


def to_yaml(value: Any, indent: int = 0) -> str:
    space = "  " * indent

    if isinstance(value, dict):
        lines: list[str] = []
        for key, item in value.items():
            if isinstance(item, (dict, list)):
                lines.append(f"{space}{key}:")
                lines.append(to_yaml(item, indent + 1))
            else:
                lines.append(f"{space}{key}: {yaml_scalar(item)}")
        return "\n".join(lines) if lines else f"{space}{{}}"

    if isinstance(value, list):
        lines: list[str] = []
        for item in value:
            if isinstance(item, dict):
                item_lines = list(item.items())
                if not item_lines:
                    lines.append(f"{space}- {{}}")
                    continue
                first_key, first_value = item_lines[0]
                if isinstance(first_value, (dict, list)):
                    lines.append(f"{space}- {first_key}:")
                    lines.append(to_yaml(first_value, indent + 2))
                else:
                    lines.append(f"{space}- {first_key}: {yaml_scalar(first_value)}")
                for key, nested in item_lines[1:]:
                    if isinstance(nested, (dict, list)):
                        lines.append(f"{space}  {key}:")
                        lines.append(to_yaml(nested, indent + 2))
                    else:
                        lines.append(f"{space}  {key}: {yaml_scalar(nested)}")
            elif isinstance(item, list):
                lines.append(f"{space}-")
                lines.append(to_yaml(item, indent + 1))
            else:
                lines.append(f"{space}- {yaml_scalar(item)}")
        return "\n".join(lines) if lines else f"{space}[]"

    return f"{space}{yaml_scalar(value)}"


def build_clash_config(source_url: str, encoding: str, entries: list[str]) -> tuple[dict[str, Any], int]:
    proxies: list[dict[str, Any]] = []
    skipped = 0

    for index, entry in enumerate(entries, start=1):
        try:
            node = parse_entry(entry)
            proxies.append(prune_none(clash_proxy_from_node(node, index)))
        except Exception:
            skipped += 1

    proxy_names = [proxy["name"] for proxy in proxies]
    config = {
        "port": 7890,
        "socks-port": 7891,
        "allow-lan": True,
        "mode": "Rule",
        "log-level": "info",
        "external-controller": "127.0.0.1:9090",
        "proxies": proxies,
        "proxy-groups": [
            {
                "name": "PROXY",
                "type": "select",
                "proxies": ["AUTO", "DIRECT", *proxy_names],
            },
            {
                "name": "AUTO",
                "type": "url-test",
                "url": "http://www.gstatic.com/generate_204",
                "interval": 300,
                "tolerance": 50,
                "proxies": proxy_names,
            },
        ],
        "rules": [
            "MATCH,PROXY",
        ],
        "subscription-info": {
            "source-url": source_url,
            "source-encoding": encoding,
            "node-count": len(proxies),
        },
    }
    return config, skipped


def main() -> int:
    load_env_file()

    parser = argparse.ArgumentParser(
        description="Decode a subscription URL into a Clash-compatible YAML file."
    )
    parser.add_argument(
        "url",
        nargs="?",
        help="Subscription URL to fetch and decode. Defaults to SUBSCRIPTION_URL from .env.",
    )
    parser.add_argument(
        "-o",
        "--output",
        default="subscription.yaml",
        help="Output YAML path. Default: subscription.yaml",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=30,
        help="HTTP timeout in seconds. Default: 30",
    )
    args = parser.parse_args()
    subscription_url = args.url or os.environ.get("SUBSCRIPTION_URL")
    if not subscription_url:
        parser.error("missing subscription URL; pass one or set SUBSCRIPTION_URL in .env")

    raw = fetch_subscription(subscription_url, args.timeout)
    text, encoding = subscription_text(raw)
    entries = split_entries(text)
    config, skipped = build_clash_config(subscription_url, encoding, entries)

    output_path = Path(args.output)
    output_path.write_text(to_yaml(config) + "\n", encoding="utf-8")

    print(
        f"Wrote {len(config['proxies'])} Clash proxies to {output_path}"
        + (f" ({skipped} skipped)" if skipped else "")
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
