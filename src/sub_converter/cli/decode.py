#!/usr/bin/env python3
"""CLI: decode a subscription source into a Clash-compatible YAML file."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from sub_converter.config.settings import is_probable_url, load_env_file, parse_source_type
from sub_converter.converters.clash import build_clash_config, load_policy_template
from sub_converter.renderers.yaml import to_yaml
from sub_converter.services.subscription import fetch_subscription, split_entries, subscription_text


def main() -> int:
    load_env_file()

    parser = argparse.ArgumentParser(
        description="Decode a subscription source into a Clash-compatible YAML file."
    )
    parser.add_argument(
        "source",
        nargs="?",
        help=(
            "Subscription source text. Accepts URL or Base64 text depending on --source-type. "
            "When source type is auto, URLs are fetched and non-URLs are treated as Base64 text."
        ),
    )
    parser.add_argument(
        "-o", "--output",
        default="subscription.yaml",
        help="Output YAML path. Default: subscription.yaml",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=30,
        help="HTTP timeout in seconds. Default: 30",
    )
    parser.add_argument(
        "--template",
        default="clash_policy_template.yaml",
        help="Policy template path. Default: clash_policy_template.yaml",
    )
    parser.add_argument(
        "--source-type",
        choices=["auto", "url", "base64"],
        help="Subscription source type. Defaults to SUBSCRIPTION_SOURCE_TYPE from .env, then auto.",
    )
    args = parser.parse_args()

    source_type_value = args.source_type or os.environ.get("SUBSCRIPTION_SOURCE_TYPE", "auto")
    try:
        source_type = parse_source_type(source_type_value)
    except ValueError as exc:
        parser.error(str(exc))

    source = args.source
    resolved_source_type = source_type
    raw: bytes

    if source_type == "url":
        source = source or os.environ.get("SUBSCRIPTION_URL") or os.environ.get("SUBSCRIPTION_SOURCE")
        if not source:
            parser.error("missing subscription URL; pass one or set SUBSCRIPTION_URL (or SUBSCRIPTION_SOURCE) in .env")
        if not is_probable_url(source):
            parser.error("source-type is url but source does not look like an http(s) URL")
        raw = fetch_subscription(source, args.timeout)
    elif source_type == "base64":
        source = (
            source
            or os.environ.get("SUBSCRIPTION_BASE64")
            or os.environ.get("SUBSCRIPTION_ENCODED")
            or os.environ.get("SUBSCRIPTION_SOURCE")
        )
        if not source:
            parser.error("missing Base64 subscription; pass one or set SUBSCRIPTION_BASE64 (or SUBSCRIPTION_ENCODED / SUBSCRIPTION_SOURCE) in .env")
        raw = source.encode("utf-8")
    else:
        source = (
            source
            or os.environ.get("SUBSCRIPTION_SOURCE")
            or os.environ.get("SUBSCRIPTION_URL")
            or os.environ.get("SUBSCRIPTION_BASE64")
            or os.environ.get("SUBSCRIPTION_ENCODED")
        )
        if not source:
            parser.error("missing subscription source; pass one or set SUBSCRIPTION_SOURCE/SUBSCRIPTION_URL/SUBSCRIPTION_BASE64 in .env")
        if is_probable_url(source):
            resolved_source_type = "url"
            raw = fetch_subscription(source, args.timeout)
        else:
            resolved_source_type = "base64"
            raw = source.encode("utf-8")

    text, encoding = subscription_text(raw)
    entries = split_entries(text)
    policy_template = load_policy_template(args.template)
    config, skipped = build_clash_config(source, resolved_source_type, encoding, entries, policy_template)

    output_path = Path(args.output)
    output_path.write_text(to_yaml(config) + "\n", encoding="utf-8")
    print(
        f"Wrote {len(config['proxies'])} Clash proxies to {output_path}"
        + (f" ({skipped} skipped)" if skipped else "")
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
