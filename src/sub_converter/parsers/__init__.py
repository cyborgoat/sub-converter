"""Route each proxy URI to its dedicated parser."""

from __future__ import annotations

from typing import Any

from sub_converter.parsers.generic import parse_netloc_url
from sub_converter.parsers.ss import parse_ss
from sub_converter.parsers.ssr import parse_ssr
from sub_converter.parsers.vmess import parse_vmess


def parse_entry(url: str) -> dict[str, Any]:
    if url.startswith("vmess://"):
        return parse_vmess(url)
    if url.startswith("ss://"):
        return parse_ss(url)
    if url.startswith("ssr://"):
        return parse_ssr(url)
    return parse_netloc_url(url)
