"""Generic URL parser for trojan://, vless://, socks://, http(s)://."""

from __future__ import annotations

from typing import Any
from urllib.parse import unquote, urlparse

from sub_converter.utils import clean_query, decode_name


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
