#!/usr/bin/env python3
"""Resolve country information for one or more IP addresses."""

from __future__ import annotations

import argparse
import ipaddress
import json
import ssl
import sys
from pathlib import Path
from typing import Any
from urllib.parse import quote
from urllib.request import Request, urlopen


def is_ip(value: str) -> bool:
    try:
        ipaddress.ip_address(value.strip())
        return True
    except ValueError:
        return False


def extract_ips_from_text(text: str) -> list[str]:
    ips: list[str] = []
    seen: set[str] = set()

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        if "server:" in line:
            _, value = line.split("server:", 1)
            candidate = value.strip().strip('"').strip("'").strip(",")
        else:
            candidate = line.strip().strip('"').strip("'").strip(",")

        if is_ip(candidate) and candidate not in seen:
            seen.add(candidate)
            ips.append(candidate)

    return ips


def collect_ips(cli_ips: list[str], input_path: str | None) -> list[str]:
    ips: list[str] = []
    seen: set[str] = set()

    for ip in cli_ips:
        if not is_ip(ip):
            raise ValueError(f"invalid IP address: {ip}")
        if ip not in seen:
            seen.add(ip)
            ips.append(ip)

    if input_path:
        text = Path(input_path).read_text(encoding="utf-8")
        for ip in extract_ips_from_text(text):
            if ip not in seen:
                seen.add(ip)
                ips.append(ip)

    return ips


def fetch_country_info(ip: str, timeout: int) -> dict[str, Any]:
    url = f"https://ipwho.is/{quote(ip)}"
    request = Request(
        url,
        headers={
            "User-Agent": "sub-converter/1.0 (+https://local.script)",
            "Accept": "application/json",
        },
    )
    context = ssl.create_default_context()
    with urlopen(request, timeout=timeout, context=context) as response:
        payload = json.loads(response.read().decode("utf-8"))

    if not payload.get("success", False):
        return {
            "ip": ip,
            "success": False,
            "error": payload.get("message", "lookup failed"),
        }

    return {
        "ip": ip,
        "success": True,
        "country": payload.get("country"),
        "country_code": payload.get("country_code"),
        "continent": payload.get("continent"),
        "region": payload.get("region"),
        "city": payload.get("city"),
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Resolve country information for IP addresses."
    )
    parser.add_argument(
        "ips",
        nargs="*",
        help="One or more IP addresses to look up.",
    )
    parser.add_argument(
        "-i",
        "--input",
        help="Optional text or Clash YAML file to extract IPs from.",
    )
    parser.add_argument(
        "-o",
        "--output",
        help="Optional output JSON path.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=15,
        help="HTTP timeout in seconds. Default: 15",
    )
    args = parser.parse_args()

    try:
        ips = collect_ips(args.ips, args.input)
    except ValueError as exc:
        parser.error(str(exc))

    if not ips:
        parser.error("provide at least one IP or use --input")

    results = [fetch_country_info(ip, args.timeout) for ip in ips]
    output = json.dumps(results, ensure_ascii=False, indent=2)

    if args.output:
        Path(args.output).write_text(output + "\n", encoding="utf-8")
        print(f"Wrote {len(results)} lookups to {args.output}")
    else:
        print(output)

    return 0


if __name__ == "__main__":
    sys.exit(main())
