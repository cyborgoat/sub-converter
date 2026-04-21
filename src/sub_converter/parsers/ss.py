"""ShadowSocks (ss://) parser."""

from __future__ import annotations

import base64
import binascii
from typing import Any

from sub_converter.utils import clean_query, decode_name, pad_base64


def parse_ss(url: str) -> dict[str, Any]:
    body = url[len("ss://"):]
    name = None
    if "#" in body:
        body, fragment = body.split("#", 1)
        name = decode_name(fragment)

    query: dict[str, str] = {}
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
