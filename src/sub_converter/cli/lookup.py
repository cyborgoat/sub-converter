#!/usr/bin/env python3
"""CLI: resolve country information for one or more IP addresses."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from sub_converter.services.geo_ip import collect_ips, fetch_country_info


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
        "-i", "--input",
        help="Optional text or Clash YAML file to extract IPs from.",
    )
    parser.add_argument(
        "-o", "--output",
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
