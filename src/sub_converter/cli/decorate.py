#!/usr/bin/env python3
"""CLI: decorate Clash proxy names with country flag emojis."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from sub_converter.decorators.flag import build_name_mapping, collect_proxy_servers, decorate_lines


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Decorate Clash proxy names with country flag emojis."
    )
    parser.add_argument(
        "-i", "--input",
        default="subscription.yaml",
        help="Input Clash YAML path. Default: subscription.yaml",
    )
    parser.add_argument(
        "-o", "--output",
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
