"""ShadowSocksR (ssr://) parser."""

from __future__ import annotations

import base64
import binascii
from typing import Any

from sub_converter.utils import clean_query, pad_base64


def parse_ssr(url: str) -> dict[str, Any]:
    payload = base64.b64decode(pad_base64(url[len("ssr://"):])).decode("utf-8", errors="strict")
    main_part, _, query_string = payload.partition("/?")
    parts = main_part.split(":")
    if len(parts) < 6:
        raise ValueError("invalid ssr entry")

    server, port, protocol, method, obfs, password_b64 = parts[:6]
    password = base64.b64decode(pad_base64(password_b64)).decode("utf-8", errors="ignore")
    query = clean_query(query_string)

    decoded_query: dict[str, Any] = {}
    for key, value in query.items():
        if key in {"remarks", "group", "protoparam", "obfsparam"}:
            try:
                decoded_query[key] = base64.b64decode(pad_base64(value)).decode("utf-8", errors="ignore")
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
