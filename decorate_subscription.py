#!/usr/bin/env python3
"""Decorate Clash proxy names with country flag emojis."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from lookup_ip_country import fetch_country_info, is_ip

NAME_LINE_RE = re.compile(r'^(\s*-\s*name:\s*)"([^"]+)"(\s*)$')
SERVER_LINE_RE = re.compile(r'^\s*server:\s*"([^"]+)"\s*$')
GROUP_ENTRY_RE = re.compile(r'^(\s*-\s*)"([^"]+)"(\s*)$')


def country_code_to_flag(country_code: str | None) -> str:
    if not country_code or len(country_code) != 2 or not country_code.isalpha():
        return "🌐"
    code = country_code.upper()
    base = 127397
    return chr(base + ord(code[0])) + chr(base + ord(code[1]))


def strip_existing_prefix(name: str) -> str:
    return re.sub(r"^(?:🌐|[\U0001F1E6-\U0001F1FF]{2})\s+", "", name).strip()


def collect_proxy_servers(lines: list[str]) -> dict[str, str]:
    mapping: dict[str, str] = {}
    in_proxies = False
    current_name: str | None = None

    for line in lines:
        if line.startswith("proxies:"):
            in_proxies = True
            current_name = None
            continue
        if in_proxies and line.startswith("proxy-groups:"):
            break

        if not in_proxies:
            continue

        name_match = NAME_LINE_RE.match(line)
        if name_match:
            current_name = name_match.group(2)
            continue

        server_match = SERVER_LINE_RE.match(line)
        if current_name and server_match:
            mapping[current_name] = server_match.group(1)
            current_name = None

    return mapping


def build_name_mapping(proxy_servers: dict[str, str], timeout: int) -> dict[str, str]:
    server_to_flag: dict[str, str] = {}
    name_mapping: dict[str, str] = {}

    for name, server in proxy_servers.items():
        clean_name = strip_existing_prefix(name)
        if server not in server_to_flag:
            if is_ip(server):
                result = fetch_country_info(server, timeout)
                flag = country_code_to_flag(result.get("country_code")) if result.get("success") else "🌐"
            else:
                flag = "🌐"
            server_to_flag[server] = flag
        name_mapping[name] = f"{server_to_flag[server]} {clean_name}"

    return name_mapping


def decorate_lines(lines: list[str], name_mapping: dict[str, str]) -> list[str]:
    decorated: list[str] = []
    in_proxies = False
    in_proxy_groups = False

    for line in lines:
        if line.startswith("proxies:"):
            in_proxies = True
            in_proxy_groups = False
            decorated.append(line)
            continue
        if line.startswith("proxy-groups:"):
            in_proxies = False
            in_proxy_groups = True
            decorated.append(line)
            continue
        if line.startswith("rules:"):
            in_proxy_groups = False
            decorated.append(line)
            continue

        if in_proxies:
            name_match = NAME_LINE_RE.match(line)
            if name_match:
                old_name = name_match.group(2)
                new_name = name_mapping.get(old_name, old_name)
                decorated.append(f'{name_match.group(1)}"{new_name}"{name_match.group(3)}')
                continue

        if in_proxy_groups:
            entry_match = GROUP_ENTRY_RE.match(line)
            if entry_match:
                old_name = entry_match.group(2)
                new_name = name_mapping.get(old_name, old_name)
                decorated.append(f'{entry_match.group(1)}"{new_name}"{entry_match.group(3)}')
                continue

        decorated.append(line)

    return decorated


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Decorate Clash proxy names with country flag emojis."
    )
    parser.add_argument(
        "-i",
        "--input",
        default="subscription.yaml",
        help="Input Clash YAML path. Default: subscription.yaml",
    )
    parser.add_argument(
        "-o",
        "--output",
        default="subscription.decorated.yaml",
        help="Output Clash YAML path. Default: subscription.decorated.yaml",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=15,
        help="Geo-IP HTTP timeout in seconds. Default: 15",
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    lines = input_path.read_text(encoding="utf-8").splitlines()
    proxy_servers = collect_proxy_servers(lines)
    name_mapping = build_name_mapping(proxy_servers, args.timeout)
    decorated_lines = decorate_lines(lines, name_mapping)

    Path(args.output).write_text("\n".join(decorated_lines) + "\n", encoding="utf-8")
    print(f"Decorated {len(name_mapping)} proxy names into {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
