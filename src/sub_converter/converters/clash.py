"""Build a complete Clash config dict from parsed proxy nodes."""

from __future__ import annotations

import binascii
import json
from pathlib import Path
from typing import Any

from sub_converter.parsers import parse_entry
from sub_converter.utils import parse_bool

ALL_PROXIES_PLACEHOLDER = "__ALL_PROXIES__"


def load_policy_template(template_path: str) -> dict[str, Any]:
    template_file = Path(template_path)
    if not template_file.exists():
        raise FileNotFoundError(
            f"policy template not found: {template_path}. "
            "Expected a pre-generated clash_policy_template.yaml."
        )
    return json.loads(template_file.read_text(encoding="utf-8"))


def prune_none(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: prune_none(v) for k, v in value.items() if v is not None}
    if isinstance(value, list):
        return [prune_none(item) for item in value]
    return value


def make_name(node: dict[str, Any], index: int) -> str:
    name = node.get("name")
    if isinstance(name, str) and name.strip():
        return name.strip()
    server = node.get("server") or "node"
    port = node.get("port") or "0"
    return f"{node.get('scheme', 'proxy')}-{index}@{server}:{port}"


def expand_policy_groups(
    template_groups: list[dict[str, Any]],
    proxy_names: list[str],
) -> list[dict[str, Any]]:
    groups: list[dict[str, Any]] = []
    for group in template_groups:
        expanded: dict[str, Any] = {}
        for key, value in group.items():
            if key != "proxies":
                expanded[key] = value
                continue
            expanded_proxies: list[str] = []
            for item in value:
                if item == ALL_PROXIES_PLACEHOLDER:
                    expanded_proxies.extend(proxy_names)
                else:
                    expanded_proxies.append(item)
            expanded["proxies"] = expanded_proxies
        groups.append(expanded)
    return groups


def clash_proxy_from_node(node: dict[str, Any], index: int) -> dict[str, Any]:
    scheme = str(node.get("scheme", "")).lower()
    name = make_name(node, index)

    if scheme == "ss":
        proxy: dict[str, Any] = {
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


def build_clash_config(
    source: str,
    source_type: str,
    encoding: str,
    entries: list[str],
    policy_template: dict[str, Any] | None = None,
) -> tuple[dict[str, Any], int]:
    proxies: list[dict[str, Any]] = []
    skipped = 0

    for index, entry in enumerate(entries, start=1):
        try:
            node = parse_entry(entry)
            proxies.append(prune_none(clash_proxy_from_node(node, index)))
        except (ValueError, KeyError, TypeError, json.JSONDecodeError, binascii.Error, UnicodeDecodeError):
            skipped += 1

    proxy_names = [proxy["name"] for proxy in proxies]

    if policy_template:
        proxy_groups = expand_policy_groups(policy_template["proxy-groups"], proxy_names)
        rules = policy_template["rules"]
    else:
        proxy_groups = [
            {"name": "PROXY", "type": "select", "proxies": ["AUTO", "DIRECT", *proxy_names]},
            {
                "name": "AUTO",
                "type": "url-test",
                "url": "http://www.gstatic.com/generate_204",
                "interval": 300,
                "tolerance": 50,
                "proxies": proxy_names,
            },
        ]
        rules = ["MATCH,PROXY"]

    config = {
        "port": 7890,
        "socks-port": 7891,
        "allow-lan": True,
        "mode": "Rule",
        "log-level": "info",
        "external-controller": "127.0.0.1:9090",
        "proxies": proxies,
        "proxy-groups": proxy_groups,
        "rules": rules,
        "subscription-info": {
            "source": source,
            "source-type": source_type,
            "source-encoding": encoding,
            "node-count": len(proxies),
        },
    }
    return config, skipped
