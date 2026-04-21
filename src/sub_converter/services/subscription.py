"""Fetch, decode, and split raw subscription data."""

from __future__ import annotations

import base64
import binascii
import re
import ssl
from urllib.request import Request, urlopen

from sub_converter.utils import pad_base64


def fetch_subscription(url: str, timeout: int) -> bytes:
    request = Request(
        url,
        headers={
            "User-Agent": "sub-converter/1.0 (+https://local.script)",
            "Accept": "*/*",
        },
    )
    context = ssl.create_default_context()
    with urlopen(request, timeout=timeout, context=context) as response:
        return response.read()


def try_decode_base64_text(raw: bytes) -> str | None:
    text = raw.decode("utf-8", errors="ignore").strip()
    if not text:
        return ""

    candidate = pad_base64(text)
    if not re.fullmatch(r"[A-Za-z0-9+/=]+", candidate):
        return None

    try:
        decoded = base64.b64decode(candidate, validate=False)
    except (binascii.Error, ValueError):
        return None

    decoded_text = decoded.decode("utf-8", errors="ignore").strip()
    if not decoded_text:
        return None

    known_prefixes = (
        "ss://", "ssr://", "vmess://", "vless://", "trojan://",
        "socks://", "http://", "https://", "hy2://", "hysteria2://",
        "tuic://", "wireguard://",
    )
    if decoded_text.startswith(known_prefixes) or "\n" in decoded_text:
        return decoded_text

    return None


def subscription_text(raw: bytes) -> tuple[str, str]:
    decoded = try_decode_base64_text(raw)
    if decoded is not None:
        return decoded, "base64"
    return raw.decode("utf-8", errors="ignore"), "plain"


def split_entries(text: str) -> list[str]:
    entries: list[str] = []
    for line in text.splitlines():
        item = line.strip()
        if not item or item.startswith("#"):
            continue
        entries.append(item)
    return entries
